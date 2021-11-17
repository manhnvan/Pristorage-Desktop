const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
  'ipc-example', 
  'create-account', 
  'decrypt-string-data',
  'encrypt-string-data',
  'get-public-key-by-private-key',
  'encrypt-then-upload',
  'update-file',
  'encrypt-share-file-password',
  'encrypt-share-folder-password',
  'start-sync-data-from-contract',
  'create-shared-folder',
  'encrypt-then-upload-to-shared-folder',
  'should-start-sync'
];

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    myPing() {
      ipcRenderer.send('ipc-example', 'ping');
    },
    createAccount(accountId, token) {
      ipcRenderer.send('create-account', {accountId, token});
    },
    decryptStringTypeData(privateKey, data) {
      ipcRenderer.send('decrypt-string-data', {privateKey, data});
    },
    shouldSyncStart() {
      ipcRenderer.send('should-start-sync');
    },
    createSharedFolder(publicKey, password ,data) {
      ipcRenderer.send('create-shared-folder', {publicKey, password ,data});
    },
    openFile(web3Token, info) {
      ipcRenderer.send('open-file', {web3Token, info});
    },
    encryptThenUpload(web3Token, path, password, fileInfo) {
      ipcRenderer.send('encrypt-then-upload', {web3Token, path, password, fileInfo});
    },
    updateFile(web3Token, fileInfo) {
      ipcRenderer.send('update-file', {web3Token, fileInfo});
    },
    encryptThenUploadToSharedFolder(web3Token, path, password, fileInfo) {
      ipcRenderer.send('encrypt-then-upload-to-shared-folder', {web3Token, path, password, fileInfo});
    },
    decryptThenDownload(web3Token, info) {
      ipcRenderer.send('decrypt-then-download', {web3Token, info});
    },
    encryptShareFilePassword(sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo) {
      ipcRenderer.send('encrypt-share-file-password', {sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo});
    },
    encryptSharedFolderFilePassword(sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo) {
      ipcRenderer.send('encrypt-share-folder-password', {sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo});
    },
    startSyncDataFromContract(user, myFiles, sharedFilesWithMe) {
      ipcRenderer.send('start-sync-data-from-contract', {user , myFiles, sharedFilesWithMe});
    },
    on(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.on(channel, (event, ...args) => func(...args));
      }
    },
    once(channel, func) {
      if (validChannels.includes(channel)) {
        // Deliberately strip event as it includes `sender`
        ipcRenderer.once(channel, (event, ...args) => func(...args));
      }
    },
  },
});
