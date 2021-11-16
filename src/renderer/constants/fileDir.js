const APP_STORE_FOLDER = 'C:/Users/Manhnv/Downloads/Pristorage'
const APP_STORE_TEMP = `${APP_STORE_FOLDER}/PristorageTemp`
const APP_STORE_MY_FILES_FOLDER = `${APP_STORE_FOLDER}/MyFiles`
const APP_STORE_FILES_SHARED_WITH_ME = `${APP_STORE_FOLDER}/FilesSharedWithMe`
const SYNC_MY_FILE_JSON = `${APP_STORE_TEMP}/syncMyFiles.json`
const SYNC_FILES_SHARED_WITH_ME = `${APP_STORE_TEMP}/syncSharedFileWithMe.json`
const LAST_UPDATE = `${APP_STORE_TEMP}/last_update.json`
module.exports = {
    APP_STORE_FOLDER,
    APP_STORE_TEMP,
    APP_STORE_MY_FILES_FOLDER,
    APP_STORE_FILES_SHARED_WITH_ME,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME,
    LAST_UPDATE
}