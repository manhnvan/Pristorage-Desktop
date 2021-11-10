import { Web3Storage, getFilesFromPath } from 'web3\.storage'

function makeStorageClient(token) {
    return new Web3Storage({ token })
}

async function storeFiles(token, files, onRootCidReady, onStoredChunk ) {
    const client = makeStorageClient(token)
    const cid = await client.put(files, { onRootCidReady, onStoredChunk })
    return cid
}

async function retrieveFiles(token, cid) {
    const client = makeStorageClient(token)
    const res = await client.get(cid)
    console.log(`Got a response! [${res.status}] ${res.statusText}`)
    if (!res.ok) {
        throw new Error(`failed to get ${cid} - [${res.status}] ${res.statusText}`)
    }

    const files = await res.files()
    return files
}

async function retrieve(token, cid) {
    const client = makeStorageClient(token)
    const res = await client.get(cid)
    console.log(`Got a response! [${res.status}] ${res.statusText}`)
    if (!res.ok) {
        throw new Error(`failed to get ${cid}`)
    }

}

async function checkFileStatus(token, cid) {
    const client = makeStorageClient(token)
    const status = await client.status(cid)
    if (status) {
        console.log(status)
    }
}

async function validateToken(token) {
    const web3storage = new Web3Storage({ token })

    try {
        for await (const _ of web3storage.list({ maxResults: 1})) {
            break
        }
        return true
    } catch (e) {
        return false
    }
}

module.exports = {
    storeFiles,
    retrieveFiles,
    retrieve,
    checkFileStatus,
    validateToken
}