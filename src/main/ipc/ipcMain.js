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
        const {web3Token, path, password, fileInfo} = args
        console.log(args)
        const buffer = fs.readFileSync(path)
        const encrypted = await encryptSingleFile(buffer, fileInfo.filename, password);
        const {success, cipher} = await encryptStringTypeData(fileInfo.publicKey, password) 
        if (success) {
            fs.writeFile(`${APP_STORE_TEMP}/${fileInfo.id}.enc`, encrypted, async function (err) {
                if (err) return console.log(err);
                const pathFiles = await getFilesFromPath(`${APP_STORE_TEMP}/${fileInfo.id}.enc`)
                const cid = await storeFiles(web3Token, pathFiles);
                event.reply('encrypt-then-upload', {
                    success,
                    ...fileInfo,
                    cid,
                    encryptedPassword: cipher
                });
                fs.unlink(`${APP_STORE_TEMP}/${fileInfo.id}.enc`, function(err) {
                    if(err && err.code == 'ENOENT') {
                        // file doens't exist
                        console.info("File doesn't exist, won't remove it.");
                    } else if (err) {
                        // other errors, e.g. maybe we don't have enough permission
                        console.error("Error occurred while trying to remove file");
                    } else {
                        console.info(`removed`);
                    }
                });
            });
        } else {
            event.reply('encrypt-then-upload', {
                success: false
            })
        }
    })

    ipcMain.on('decrypt-then-download', async (event, args) => {
        const {web3Token, info} = args
        const {cid, encrypted_password, file_type, id, privateKey, name} = info
        const fileRetrieve = await retrieveFiles(web3Token, cid)
        const file = fileRetrieve[0]
        const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        if (success) {
            const decrypted = await decryptSingleFile(file, plaintext)
            const buffer = Buffer.from( await decrypted.arrayBuffer() );
            fs.writeFile(`${APP_STORE_MY_FILES_FOLDER}/${id}_${cid}_${name}`, buffer, function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    })
    ipcMain.on('start-sync-data-from-contract', async (event, args) => {
        const {user ,myFiles ,sharedFilesWithMe} = args
        // if (fs.existsSync(path)) {
        //     //file exists

        // }

        const jsonFilesData = JSON.stringify(myFiles)
        fs.writeFile(SYNC_MY_FILE_JSON, jsonFilesData, 'utf8', function (err) {
            if (err) {
                console.log(err);
            }

        });
        const jsonSharedWithFilesData = JSON.stringify(sharedFilesWithMe)
        fs.writeFile(SYNC_FILES_SHARED_WITH_ME, jsonSharedWithFilesData, 'utf8', function (err) {
            if (err) {
                console.log(err);
            }
            const child = fork(path.join(__dirname, '../bgProcess/syncShareWithMeFile.js'))

            child.send({type: 'start', info: user})
            child.on('message', function (data) {
                console.log(data)
            })
        });
    })
}