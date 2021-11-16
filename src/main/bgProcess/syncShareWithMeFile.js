const {
    createKeyPair,
    getPublicKeyByPrivateKey,
    encryptStringTypeData,
    decryptStringTypeData
} = require('../lib/keypair.module')

const {
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
} = require('../lib/file.module')

const {
    storeFiles,
    retrieveFiles,
    retrieve,
    checkFileStatus,
    validateToken,
} = require('../lib/web3.storage.module')

const {
    APP_STORE_FOLDER,
    APP_STORE_TEMP,
    APP_STORE_MY_FILES_FOLDER,
    APP_STORE_FILES_SHARED_WITH_ME,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME
} = require('../constant')

const fs = require('fs')

const { Blob, Buffer } = require('buffer');
const { File , getFilesFromPath } = require('web3.storage')
const path = require('path');

process.on('message', function(message) {
    const {type, info} = message
    const {privateKey, web3token} = info
    if (type === 'start') {
        const sharedFileWithMeListRaw = fs.readFileSync(SYNC_FILES_SHARED_WITH_ME);
        const sharedFileWithMeList = JSON.parse(sharedFileWithMeListRaw)
        let filesToSync = []
        fs.readdir(APP_STORE_FOLDER, (err, files) => {
            sharedFileWithMeList.forEach(fileSharedWithMe => {
                const matchFileId = files.find(item => item.startsWith(fileSharedWithMe.id))
                if (matchFileId) {
                    if (!matchFileId.includes(fileSharedWithMe.cid)) {
                        fs.unlinkSync(`${APP_STORE_FOLDER}/${matchFileId}`);
                        filesToSync.push(fileSharedWithMe)
                    }
                } else {
                    filesToSync.push(fileSharedWithMe)
                }
            })
            Promise.all(filesToSync.map(async syncFile => {
                const {id, cid, encrypted_password, file_type, name} = syncFile
                const fileRetrieve = await retrieveFiles(web3token, cid)
                const file = fileRetrieve[0]
                const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
                if (success) {
                    const decrypted = await decryptSingleFile(file, plaintext)
                    const buffer = Buffer.from( await decrypted.arrayBuffer() );
                    fs.writeFile(`${APP_STORE_FOLDER}/${id}_${cid}_${name}`, buffer, function (err) {
                        if (err) {
                            process.send(err)
                        }
                    });
                }
            })).catch(err => {
                process.send(err)
            })
        });
    }
})