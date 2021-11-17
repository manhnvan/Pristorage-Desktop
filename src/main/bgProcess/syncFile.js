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
    APP_LOCAL_FOLDER,
    APP_STORE_MY_FILES_FOLDER,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME,
    LAST_UPDATE,
    SYNC_REPORT
} = require('../constant')

const fs = require('fs')

const { Blob, Buffer } = require('buffer');
const { File , getFilesFromPath } = require('web3.storage')
const path = require('path');

const sha256File = require('sha256-file');

const LOCAL = 'Local'
const PRISTORAGE_TEMP = 'PristorageTemp'


process.on('message', function(message) {
    const {type, info} = message
    const {privateKey, web3token} = info
    if (type === 'start') {

        const syncReportInterval = setInterval(() => {
            const syncReport = {
                status: 1,
                lastReport: Date.now()
            }
            const syncJSON = JSON.stringify(syncReport)
            fs.writeFile(SYNC_REPORT, syncJSON, 'utf8', function (err) {
                if (err) {
                    console.log(err);
                }
            });
        }, 3000)

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
            process.send({filesToSync})
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
                })
                .catch(err => {
                    process.send({success: false, error: err.message})
                })
            }))
            .then(() => {
                const filesAndFolders = fs.readdirSync(APP_STORE_FOLDER);
                const files = filesAndFolders.filter(fileOrFolder => {
                    return fileOrFolder !== LOCAL && fileOrFolder !== PRISTORAGE_TEMP
                })
                files.forEach(file => {
                    const fileOnChain = myFiles.find(myFile => {
                        return file === `${myFile.id}_${myFile.cid}_${myFile.name}`
                    })
                    if (!fileOnChain) {
                        const originFilePath = `${APP_STORE_FOLDER}/${file}`
                        fs.unlink(originFilePath, (err) => {
                            if (err) {
                                process.send({unlink: false, error: err.message});
                            }
                        })
                    }
                })
            })
            .then(() => {
                fs.readdir(APP_LOCAL_FOLDER, (err, files) => {
                    if (err) throw err
                    files.forEach(file => {
                        const localFilePath = `${APP_LOCAL_FOLDER}/${file}`
                        const originFilePath = `${APP_STORE_FOLDER}/${file}`
                        const fileLocalSHA = sha256File(localFilePath);
                        const fileOriginSHA = sha256File(originFilePath)
                        if (fileLocalSHA === fileOriginSHA) {
                            fs.unlink(localFilePath, (err) => {
                                if (err) {
                                    process.send({unlink: false, error: err.message});
                                }
                            })
                        }
                    })
                })
            })
            .then(() => {
                clearInterval(syncReportInterval);
                const syncReport = {
                    status: 0,
                    lastReport: Date.now()
                }
                const syncJSON = JSON.stringify(syncReport)
                fs.writeFile(SYNC_REPORT, syncJSON, 'utf8', function (err) {
                    if (err) {
                        console.log(err);
                    }
                });
            })
            .catch(err => {
                process.send(err)
            })
        });
    }
})