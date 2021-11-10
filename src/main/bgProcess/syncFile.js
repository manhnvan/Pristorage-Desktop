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

// function main() {
//     fs.readFileSync()
// }

process.on('message', function(message) {
    const {type, info} = message
    process.send({type, info})
    const {privateKey, web3Token} = info
    if (message === 'start') {
        const sharedFileWithMeListRaw = fs.readFileSync(SYNC_FILES_SHARED_WITH_ME);
        const sharedFileWithMeList = JSON.parse(sharedFileWithMeListRaw)
        process.send(sharedFileWithMeList)
        fs.readdir(APP_STORE_FILES_SHARED_WITH_ME, (err, files) => {
            
            files.forEach(file => {
                console.log(file);
            });
        });
        // sharedFileWithMeList.forEach(file => {
        //     const {cid, encrypted_password, file_type, privateKey, name} = info
        //     const fileRetrieve = await retrieveFiles(web3Token, cid)
        //     const file = fileRetrieve[0]
        //     const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
        //     if (success) {
        //         const decrypted = await decryptSingleFile(file, plaintext)
        //         const buffer = Buffer.from( await decrypted.arrayBuffer() );
        //         fs.writeFile(`${APP_STORE_MY_FILES_FOLDER}/${cid}_${name}`, buffer, function (err) {
        //             if (err) {
        //                 console.log(err);
        //             }
        //         });
        //     }
        // })
    }
})