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
    LAST_UPDATE
} = require('../constant')

const fs = require('fs')

const { Blob, Buffer } = require('buffer');
const { File , getFilesFromPath } = require('web3.storage')
const path = require('path');

const sha256File = require('sha256-file');

process.on('message', function(message) {
    const {type, info} = message
    const {privateKey, web3token} = info
    if (type === 'start') {
        const myFilesRaw = fs.readFileSync(SYNC_MY_FILE_JSON);
        const myFiles = JSON.parse(myFilesRaw)
        let filesToSync = []
        fs.readdir(APP_STORE_FOLDER, (err, files) => {
            myFiles.forEach(myFile => {
                const matchFileId = files.find(item => item.startsWith(myFile.id))
                if (matchFileId) {
                    if (!matchFileId.includes(myFile.cid)) {
                        fs.unlinkSync(`${APP_STORE_FOLDER}/${matchFileId}`);
                        filesToSync.push(myFile)
                    }
                } else {
                    filesToSync.push(myFile)
                }
            })
            return Promise.all(filesToSync.map(async syncFile => {
                const {id, cid, encrypted_password, file_type, name} = syncFile
                const filesRetrieve = await retrieveFiles(web3token, cid)
                const { success, plaintext } = await decryptStringTypeData(privateKey, encrypted_password)
                const decDir = `${APP_STORE_TEMP}/DEC_${id}`
                if (!fs.existsSync(decDir)) {
                    fs.mkdirSync(decDir)
                }
                return Promise.all(filesRetrieve.map(async file => {
                    const baseName = path.parse(file._name).name;
                    const decrypted = await decryptSingleFile(file, plaintext)
                    const buffer = Buffer.from( await decrypted.arrayBuffer() );
                    fs.writeFileSync(`${decDir}/${baseName}`, buffer)
                }))
                .then(() => {
                    const names = fs.readdirSync(decDir)
                    const filePaths = names.map(name => {
                        return `${decDir}/${name}`
                    })
                    mergeFilesFunc(filePaths, `${APP_STORE_FOLDER}/${id}_${cid}_${name}`).then(() => {
                        fs.rmdirSync(decDir, { recursive: true, force: true })
                        process.send({success: true})
                    }).catch(err => {
                        process.send({success: false, error: err.message})
                    })
                    
                }).catch(err => {
                    process.send({success: false, error: err.message})
                })
            })).catch(err => {
                process.send(err)
            })
        });
    }
})