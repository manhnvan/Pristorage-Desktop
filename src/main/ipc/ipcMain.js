import {
    createKeyPair,
    getPublicKeyByPrivateKey,
    encryptStringTypeData,
    decryptStringTypeData
} from '../lib/keypair.module'

import {
    createChunks,
    concatenateBlobs,
    getBase64,
    saveFile,
    getSplittedEncodeFiles,
    encryptSingleFile,
    encrypt,
    convertWordArrayToUint8Array,
    getFileAsText,
    decrypt,
    decryptSingleFile
} from '../lib/file.module'

import {
    storeFiles,
    retrieveFiles,
    retrieve,
    checkFileStatus,
    validateToken,
} from '../lib/web3.storage.module'

import sha256File from 'sha256-file'

import fs from 'fs'

import { Blob, Buffer } from 'buffer';
import { File , getFilesFromPath } from 'web3.storage'
import path from 'path';
const { fork } = require('child_process');

const {shell} = require('electron');

import {
    APP_STORE_FOLDER,
    APP_STORE_TEMP,
    APP_STORE_MY_FILES_FOLDER,
    APP_LOCAL_FOLDER,
    APP_STORE_FILES_SHARED_WITH_ME,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME,
    SYNC_REPORT,
    PRIVATE_KEY_PATH
} from '../constant'

export function createIPCMain(ipcMain) {
    ipcMain.on('create-account', async (event, args) => {
        const {accountId, token} = args
        const isValid = await validateToken(token)
        const {privateKey, publicKey} = createKeyPair()
        const {success, cipher} = await encryptStringTypeData(publicKey, token)
        if (isValid) {
            fs.writeFile(`${PRIVATE_KEY_PATH}/${accountId}_private_key.txt`, privateKey, 'utf8', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
        event.reply('create-account', {
            accountId, 
            token,
            privateKey,
            publicKey,
            success,
            encryptedToken: cipher,
            isValid
        });
    })

    ipcMain.on('get-public-key-by-private-key', async (event, args) => {
        const {privateKey} = args;
        const publicKey = getPublicKeyByPrivateKey(privateKey)
        event.reply('get-public-key-by-private-key', publicKey);
    })

    ipcMain.on('encrypt-string-data', async (event, args) => {
        const {publicKey, data} = args;
        const encrypted = await encryptStringTypeData(publicKey, data)
        event.reply('encrypt-string-data', encrypted);
    })

    ipcMain.on('decrypt-token', async (event, args) => {
        const {privateKey, data} = args
        const decrypted = await decryptStringTypeData(privateKey, data)
        event.reply('decrypt-token', decrypted);
    })

    ipcMain.on('create-shared-folder', async (event, args) => {
        const {publicKey, password ,data} = args
        const encrypted = await encryptStringTypeData(publicKey, password)
        event.reply('create-shared-folder', {encrypted, data});
    })

    ipcMain.on('encrypt-share-file-password', async (event, args) => {
        const {sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo} = args;
        const {success, plaintext} = await decryptStringTypeData(ownerPrivateKey, encryptedPassword);
        if (success) {
            const {success: encryptSuccess, cipher} = await encryptStringTypeData(sharePublicKey, plaintext)
            if (encryptSuccess) {
                event.reply('encrypt-share-file-password', {success: encryptSuccess, _password: cipher, ...docInfo});
            } else {
                event.reply('encrypt-share-file-password', {success: false, reason: 'fail to encrypt share password', ...docInfo});
            }
        } else {
            event.reply('encrypt-share-file-password', {success: false, reason: 'fail to decrypt share password', ...docInfo});
        }
    })

    ipcMain.on('encrypt-share-folder-password', async (event, args) => {
        const {sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo} = args;
        const {success, plaintext} = await decryptStringTypeData(ownerPrivateKey, encryptedPassword);
        if (success) {
            const {success: encryptSuccess, cipher} = await encryptStringTypeData(sharePublicKey, plaintext)
            if (encryptSuccess) {
                event.reply('encrypt-share-folder-password', {success: encryptSuccess, _password: cipher, ...docInfo});
            } else {
                event.reply('encrypt-share-folder-password', {success: false, reason: 'fail to encrypt share password', ...docInfo});
            }
        } else {
            event.reply('encrypt-share-folder-password', {success: false, reason: 'fail to decrypt share password', ...docInfo});
        }
    })

    ipcMain.on('encrypt-then-upload', async (event, args) => {
        console.log(args)
        let {web3Token, path: filePath, password, fileInfo} = args
        const {id, reqType, cid: oldCid, filename, encrypted_password, privateKey, publicKey} = fileInfo
        const originFilePath = `${APP_STORE_FOLDER}/${id}_${oldCid}_${filename}`
        const localFilePath = `${APP_LOCAL_FOLDER}/${id}_${oldCid}_${filename}`
        if (reqType === 'sync') {
            if (!fs.existsSync(localFilePath) || !fs.existsSync(originFilePath)) {
                event.reply('encrypt-then-upload', {
                    success: false,
                    message: 'Nothing to update'
                });
                return;
            } 
            const fileLocalSHA = sha256File(localFilePath);
            const fileOriginSHA = sha256File(originFilePath)
            if (fileLocalSHA === fileOriginSHA) {
                event.reply('encrypt-then-upload', {
                    success: false,
                    message: 'Nothing to update'
                });
                return;
            }
            const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
            if (!success) {
                event.reply('encrypt-then-upload', {
                    success: false,
                    message: 'Cannot decrypt file password'
                });
                return;
            }
            filePath = localFilePath
            password = plaintext
        }
        
        const childProcess = fork(path.join(__dirname, '../bgProcess/fileEncrypt.js'))
        childProcess.send({type: 'start', info: {
            filePath,
            id,
            password
        }})
        childProcess.on('message', async function (data) {
            const {success, encDir, tempDir} = data
            if (success) {
                const {success: passwordEncryptedStatus, cipher: passwordEncrypted} = await encryptStringTypeData(fileInfo.publicKey, password) 
                if (passwordEncryptedStatus) {
                    const pathFiles = await getFilesFromPath(encDir)
                    const cid = await storeFiles(web3Token, pathFiles);
                    event.reply('encrypt-then-upload', {
                        success,
                        ...fileInfo,
                        cid,
                        encryptedPassword: passwordEncrypted
                    });
                    fs.rmdirSync(tempDir, { recursive: true, force: true })
                    fs.rmdirSync(encDir, { recursive: true, force: true })
                    if (reqType === 'sync') {
                        const newOriginFilePath = `${APP_STORE_FOLDER}/${id}_${cid}_${filename}`
                        fs.copyFile(localFilePath, newOriginFilePath, (err) => {
                            if (err) {
                                console.log(err)
                            };
                            
                        });
                        fs.unlinkSync(localFilePath);
                        fs.unlinkSync(originFilePath);
                    }
                }
            }
        })
    })

    ipcMain.on('update-file', async (event, args) => {
        const {web3Token, fileInfo} = args
        const {id, cid: oldCid, filename, encrypted_password, privateKey, publicKey} = fileInfo
        const originFilePath = `${APP_STORE_FOLDER}/${id}_${oldCid}_${filename}`
        const localFilePath = `${APP_LOCAL_FOLDER}/${id}_${oldCid}_${filename}`
        if (!fs.existsSync(localFilePath) || !fs.existsSync(originFilePath)) {
            event.reply('update-file', {
                success: false,
                message: 'Nothing to update'
            });
            return;
        } 
        const fileLocalSHA = sha256File(localFilePath);
        const fileOriginSHA = sha256File(originFilePath)
        if (fileLocalSHA === fileOriginSHA) {
            event.reply('update-file', {
                success: false,
                message: 'Nothing to update'
            });
            return;
        }
        const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        if (!success) {
            event.reply('update-file', {
                success: false,
                message: 'Cannot decrypt file password'
            });
            return;
        }
        const filePath = localFilePath
        const password = plaintext

        const childProcess = fork(path.join(__dirname, '../bgProcess/fileEncrypt.js'))
        childProcess.send({type: 'start', info: {
            filePath,
            id,
            password
        }})
        childProcess.on('message', async function (data) {
            const {success, encDir, tempDir} = data
            if (success) {
                const pathFiles = await getFilesFromPath(encDir)
                const cid = await storeFiles(web3Token, pathFiles);
                event.reply('update-file', {
                    success,
                    ...fileInfo,
                    cid,
                });
                fs.rmdirSync(tempDir, { recursive: true, force: true })
                fs.rmdirSync(encDir, { recursive: true, force: true })
                const newOriginFilePath = `${APP_STORE_FOLDER}/${id}_${cid}_${filename}`
                fs.copyFile(localFilePath, newOriginFilePath, (err) => {
                    if (err) {
                        console.log(err)
                    };
                    
                });
                fs.unlinkSync(localFilePath);
                fs.unlinkSync(originFilePath);
            }
        })
    })

    ipcMain.on('open-file', async (event, args) => {
        const {web3Token, info} = args
        const {cid, encrypted_password, id, privateKey, name, sharedPassword, isSharedFile} = info
        const localFilePath = `${APP_LOCAL_FOLDER}/${id}_${cid}_${name}`
        const originFilePath = `${APP_STORE_FOLDER}/${id}_${cid}_${name}`
        console.log(info)
        if (fs.existsSync(localFilePath)) {
            shell.openPath(localFilePath)
        } else if (fs.existsSync(originFilePath)) {
            fs.copyFile(originFilePath, localFilePath, (err) => {
                if (err) {
                    console.log(err)
                };
                shell.openPath(localFilePath)
            });
        } else {
            let password = encrypted_password;
            if (isSharedFile) {
                password = sharedPassword
            }
            const { success, plaintext } = await decryptStringTypeData(privateKey, password)
            if (success) {
                const childProcess = fork(path.join(__dirname, '../bgProcess/retrieveAndDecrypt.js'))
                childProcess.send({type: 'start', info: {
                    web3Token, 
                    info,
                    cid,
                    id,
                    name,
                    password: plaintext
                }})
                childProcess.on('message', async function (data) {
                    console.log(data)
                    const {success} = data
                    if (success) {
                        fs.copyFile(originFilePath, localFilePath, (err) => {
                            if (err) {
                                console.log(err)
                            };
                            shell.openPath(localFilePath)
                        });
                    }
                })
            } else {
                console.log("fail to open")
            }
        }
    })

    ipcMain.on('encrypt-then-upload-to-shared-folder', async (event, args) => {
        let {web3Token, path: filePath, password, fileInfo} = args
        const {id, reqType, cid: oldCid, filename, privateKey, publicKey} = fileInfo
        const originFilePath = `${APP_STORE_FOLDER}/${id}_${oldCid}_${filename}`
        const localFilePath = `${APP_LOCAL_FOLDER}/${id}_${oldCid}_${filename}`
        if (reqType === 'sync') {
            if (!fs.existsSync(localFilePath) || !fs.existsSync(originFilePath)) {
                event.reply('encrypt-then-upload-to-shared-folder', {
                    success: false,
                    message: 'Nothing to update'
                });
                return;
            } 
            const fileLocalSHA = sha256File(localFilePath);
            const fileOriginSHA = sha256File(originFilePath)
            if (fileLocalSHA === fileOriginSHA) {
                event.reply('encrypt-then-upload-to-shared-folder', {
                    success: false,
                    message: 'Nothing to update'
                });
                return;
            }
            filePath = localFilePath
        }
        const {success: decryptedPasswordStatus, plaintext: decryptedPassword} = await decryptStringTypeData(fileInfo.privateKey, password) 
        if (decryptedPasswordStatus) {
            const childProcess = fork(path.join(__dirname, '../bgProcess/fileEncrypt.js'))
            childProcess.send({type: 'start', info: {
                filePath,
                id,
                password: decryptedPassword
            }})
            childProcess.on('message', async function (data) {
                const {success, encDir, tempDir} = data
                if (success) {
                    const pathFiles = await getFilesFromPath(encDir)
                    const cid = await storeFiles(web3Token, pathFiles);
                    event.reply('encrypt-then-upload-to-shared-folder', {
                        success,
                        ...fileInfo,
                        cid
                    });
                    fs.rmdirSync(tempDir, { recursive: true, force: true })
                    fs.rmdirSync(encDir, { recursive: true, force: true })
                    if (reqType === 'sync') {
                        const newOriginFilePath = `${APP_STORE_FOLDER}/${id}_${cid}_${filename}`
                        fs.copyFile(localFilePath, newOriginFilePath, (err) => {
                            if (err) {
                                console.log(err)
                            };
                        });
                        fs.unlinkSync(localFilePath);
                        fs.unlinkSync(originFilePath);
                    }
                }
            })
        } else {
            event.reply('encrypt-then-upload-to-shared-folder', {
                success: false,
                message: 'Cannot decrypt file password'
            });
            return;
        }
    })

    ipcMain.on('decrypt-then-download', async (event, args) => {
        const {web3Token, info} = args
        const {cid, encrypted_password, id, privateKey, name} = info
        const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        if (success) {
            const childProcess = fork(path.join(__dirname, '../bgProcess/retrieveAndDecrypt.js'))
            childProcess.send({type: 'start', info: {
                web3Token, 
                info,
                cid,
                id,
                name,
                password: plaintext
            }})
            childProcess.on('message', async function (data) {
                console.log(data);
            })
        }
    })

    ipcMain.on('should-start-sync', async (event) => {
        fs.readFile(SYNC_REPORT, (err, data) => {
            if (err) {
                console.log(err);
                event.reply('should-start-sync', {shouldStartSync: true});
                return
            };
            let report = JSON.parse(data);
            const lastReport = report.lastReport
            const currentTimeStamp = new Date().getTime()
            const diff = currentTimeStamp - lastReport
            const tenMinutes = 5 * 60 * 1000
            const fifteenMinutes = 15 * 60 * 1000
            if (report.status === 1 && diff > fifteenMinutes) {
                event.reply('should-start-sync', {shouldStartSync: true})
                return
            }
            if (report.status === 0 && diff > tenMinutes) {
                event.reply('should-start-sync', {shouldStartSync: true})
                return
            } 
            event.reply('should-start-sync', {shouldStartSync: false})
        })
    })

    ipcMain.on('start-sync-data-from-contract', async (event, args) => {
        const {user ,myFiles ,sharedFilesWithMe} = args
        const data = [...myFiles, ...sharedFilesWithMe]
        const jsonFilesData = JSON.stringify(data)
        fs.writeFile(SYNC_MY_FILE_JSON, jsonFilesData, 'utf8', function (err) {
            if (err) {
                console.log(err);
            }
            const syncFilesChild = fork(path.join(__dirname, '../bgProcess/syncFile.js'))
            syncFilesChild.send({type: 'start', info: user})
            syncFilesChild.on('message', function (data) {
                console.log(data)
            })
        });
    })
}