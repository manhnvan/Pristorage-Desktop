const { contextBridge, ipcRenderer } = require('electron');

const validChannels = [
  'ipc-example', 
  'create-account', 
  'decrypt-string-data',
  'encrypt-string-data',
  'get-public-key-by-private-key',
  'encrypt-then-upload',
  'encrypt-share-file-password',
  'start-sync-data-from-contract',
  'create-shared-folder',
  'encrypt-then-upload-to-shared-folder'
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
    createSharedFolder(publicKey, password ,data) {
      ipcRenderer.send('create-shared-folder', {publicKey, password ,data});
    },
    openFile(fileInfo) {
      ipcRenderer.send('open-file', {fileInfo});
    },
    encryptThenUpload(web3Token, path, password, fileInfo) {
      ipcRenderer.send('encrypt-then-upload', {web3Token, path, password, fileInfo});
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
