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

import fs from 'fs'

import { Blob, Buffer } from 'buffer';
import { File , getFilesFromPath } from 'web3.storage'
import path from 'path';
const { fork } = require('child_process');

import {
    APP_STORE_FOLDER,
    APP_STORE_TEMP,
    APP_STORE_MY_FILES_FOLDER,
    APP_STORE_FILES_SHARED_WITH_ME,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME
} from '../constant'

export function createIPCMain(ipcMain) {
    ipcMain.on('create-account', async (event, args) => {
        const {accountId, token} = args
        const isValid = await validateToken(token)
        const {privateKey, publicKey} = createKeyPair()
        const {success, cipher} = await encryptStringTypeData(publicKey, token)
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

    ipcMain.on('decrypt-string-data', async (event, args) => {
        const {privateKey, data} = args
        const decrypted = await decryptStringTypeData(privateKey, data)
        event.reply('decrypt-string-data', decrypted);
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

    ipcMain.on('encrypt-then-upload', async (event, args) => {
        const {web3Token, path: filePath, password, fileInfo} = args
        const {id} = fileInfo
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
                }
            }
        })
    })

    ipcMain.on('open-file', async (event, args) => {
        console.log(args)
    })

    ipcMain.on('encrypt-then-upload-to-shared-folder', async (event, args) => {
        const {web3Token, path: filePath, password, fileInfo} = args
        console.log(args)
        const {id} = fileInfo
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
                }
            })
        }
    })

    ipcMain.on('decrypt-then-download', async (event, args) => {
        const {web3Token, info} = args
        console.log(args)
        const {cid, encrypted_password, id, privateKey, name} = info
        const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        console.log(success, plaintext)
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
                // const {success, encDir, tempDir} = data
                // if (success) {
                //     const pathFiles = await getFilesFromPath(encDir)
                //     const cid = await storeFiles(web3Token, pathFiles);
                //     event.reply('encrypt-then-upload-to-shared-folder', {
                //         success,
                //         ...fileInfo,
                //         cid
                //     });
                //     fs.rmdirSync(tempDir, { recursive: true, force: true })
                //     fs.rmdirSync(encDir, { recursive: true, force: true })
                // }
            })
        }
        


        // const fileRetrieve = await retrieveFiles(web3Token, cid)
        // const file = fileRetrieve[0]
        // const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        // if (success) {
        //     const decrypted = await decryptSingleFile(file, plaintext)
        //     const buffer = Buffer.from( await decrypted.arrayBuffer() );
        //     fs.writeFile(`${APP_STORE_FOLDER}/${id}_${cid}_${name}`, buffer, function (err) {
        //         if (err) {
        //             console.log(err);
        //         }
        //     });
        // }
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