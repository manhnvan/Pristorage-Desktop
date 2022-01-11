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

process.on('message', async function(message) {
    const {type, info} = message
    process.send({type, info})
    if (type === 'start') {
        const { web3Token, cid, id, name, password } = info
        const decDir = `${APP_STORE_TEMP}/DEC_${id}`
        if (!fs.existsSync(decDir)) {
            fs.mkdirSync(decDir)
        }
        const filesRetrieve = await retrieveFiles(web3Token, cid)
        return Promise.all(filesRetrieve.map(async file => {
            const baseName = path.parse(file._name).name;
            const decrypted = await decryptSingleFile(file, password)
            const buffer = Buffer.from( await decrypted.arrayBuffer() );
            fs.writeFileSync(`${decDir}/${baseName}`, buffer)
        }))
        .then(() => {
            const names = fs.readdirSync(decDir)
            const filePaths = names.map(name => {
                return `${decDir}/${name}`
            })
            process.send({success: true, names})
            mergeFilesFunc(filePaths, `${APP_STORE_FOLDER}/${id}_${cid}_${name}`).then(() => {
                fs.rmdirSync(decDir, { recursive: true, force: true })
                process.send({success: true})
            }).catch(err => {
                process.send({success: false, error: err.message})
            })
            
        }).catch(err => {
            process.send({success: false, error: err.message})
        })
    }
})