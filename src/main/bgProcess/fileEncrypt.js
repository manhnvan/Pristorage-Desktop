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
    decryptSingleFile,
    splitFileFunc,
    mergeFilesFunc
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
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME,
    LAST_UPDATE,
    FILE_MAX_SIZE
} = require('../constant')

const fs = require('fs')

const { Blob, Buffer } = require('buffer');
const { File , getFilesFromPath } = require('web3.storage')
const path = require('path');

const sha256File = require('sha256-file');

process.on('message', async  function(message) {
    const {type, info} = message
    if (type === 'start') {
        const {filePath, id, password} = info
        const tempDir = `${APP_STORE_TEMP}/TEMP_${id}`
        const encDir = `${APP_STORE_TEMP}/ENC_${id}`
        if (fs.existsSync(tempDir)) {
            fs.rmdirSync(tempDir)
        }
        if (fs.existsSync(encDir)) {
            fs.rmdirSync(encDir)
        }
        fs.mkdirSync(tempDir)
        fs.mkdirSync(encDir)
        const fileChunkNames = await splitFileFunc(filePath, FILE_MAX_SIZE, tempDir)
        return Promise.all(fileChunkNames.map(async (fileName) => {
            const baseName = path.basename(fileName);
            const buffer = fs.readFileSync(fileName)
            const encrypted = await encryptSingleFile(buffer, baseName, password);
            fs.writeFileSync(`${encDir}/${baseName}.enc`, encrypted)
        }))
        .then(() => {
            process.send({success: true, encDir, tempDir})
        })
        .catch(err => {
            process.send({success: false})
        })
    }
})