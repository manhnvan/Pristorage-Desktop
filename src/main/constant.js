const APP_STORE_FOLDER = 'C:/Users/Manhnv/Downloads/Pristorage'
const APP_STORE_TEMP = `${APP_STORE_FOLDER}/PristorageTemp`
const APP_STORE_MY_FILES_FOLDER = `${APP_STORE_FOLDER}/MyFiles`
const APP_LOCAL_FOLDER = `${APP_STORE_FOLDER}/Local`
const APP_STORE_FILES_SHARED_WITH_ME = `${APP_STORE_FOLDER}/FilesSharedWithMe`
const SYNC_MY_FILE_JSON = `${APP_STORE_TEMP}/syncFiles.json`
const SYNC_REPORT = `${APP_STORE_TEMP}/syncReport.json`
const SYNC_FILES_SHARED_WITH_ME = `${APP_STORE_TEMP}/syncSharedFileWithMe.json`
const LAST_UPDATE = `${APP_STORE_TEMP}/last_update.json`
const PRIVATE_KEY_PATH = 'C:/Users/Manhnv/Downloads'
const FILE_MAX_SIZE = 30000 * 1024

module.exports = {
    APP_STORE_FOLDER,
    APP_STORE_TEMP,
    APP_STORE_MY_FILES_FOLDER,
    APP_STORE_FILES_SHARED_WITH_ME,
    SYNC_MY_FILE_JSON,
    SYNC_FILES_SHARED_WITH_ME,
    LAST_UPDATE,
    FILE_MAX_SIZE,
    APP_LOCAL_FOLDER,
    SYNC_REPORT,
    PRIVATE_KEY_PATH
}