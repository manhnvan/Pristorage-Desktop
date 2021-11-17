import React, {useState, useEffect} from 'react'
import '../style/General.css'
import {
    DownloadOutlined,
    FolderOpenOutlined,
    FileProtectOutlined,
    FolderAddOutlined,
    UploadOutlined,
    InboxOutlined,
} from '@ant-design/icons';
import { 
    Table, 
    Tooltip,
    Button,
    Upload,
    Modal,
    Input,
    message 
} from 'antd';
import { 
    useSelector, 
    useDispatch 
} from 'react-redux';
import {
    getSharedFoldersWithMeInfo, 
    getSharedFolderById
} from '../store/slice/sharedFolderWithMe.slice'
import {wrap} from 'comlink'
import {getUrlParameter} from '../utils/url.utils'
import {useHistory} from 'react-router-dom'
import {getSharedFileInfo} from '../store/slice/sharedFileWithMe.slice'
import { v4 as uuidv4 } from 'uuid';
import {useFormik } from 'formik';
import * as Yup from 'yup';
import ShareFolderButton from '../components/ShareFolderButton'
import DeleteButton from '../components/DeleteButton'
import SyncSharedFolderFileButton from '../components/SyncSharedFolderFileButton'
import SyncSharedFileWithMeButton from '../components/SyncSharedFileWithMeButton'

const { Dragger } = Upload

const folderValidationSchema = Yup.object().shape({
    name: Yup.string().required('Invalid folder name'),
});

export default function SharedWithMe() {

    const history = useHistory()

    const [data, setData] = useState([])
    const dispatch = useDispatch()
    const {current: foldersSharedWithMe, loading: foldersSharedWithMeLoading, root: rootFoldersSharedToMe } = useSelector(state => state.sharedFolderWithMe)
    const {current: filesSharedWithMe, loading: filesSharedWithMeLoading} = useSelector(state => state.sharedFileWithMe)
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)
    const [permission, setPermission] = useState(1)
    const [root, setRoot] = useState(null)
    
    const formik = useFormik({
        initialValues: {
            name: '',
        },
        validationSchema: folderValidationSchema,
        onSubmit: async (values) => {
            const password = uuidv4()
            const id =  uuidv4()
            const publicKey = userCurrent.publicKey
            const data = {
                _id: id, 
                _name: values.name, 
                _parent: foldersSharedWithMe.id,
                _account_id: accountId
            }
            window.electron.ipcRenderer.createSharedFolder(publicKey, password, data)
        }
    })

    const {values, errors, handleChange, handleSubmit, setFieldValue} = formik

    const [isModalCreateFolderVisible, setIsModalCreateFolderVisible] = useState(false);
    const [isModalUploadVisible, setIsModalUploadVisible] = useState(false);

    const showModalCreateFolder = () => {
        setIsModalCreateFolderVisible(true);
    };
    
    const handleCancelCreateFolder = () => {
        setIsModalCreateFolderVisible(false);
    };

    const showModalUpload = () => {
        setIsModalUploadVisible(true);
    };
    
    const handleUpload = () => {
        setIsModalUploadVisible(false);
    };
    
    const handleCancelUpload = () => {
        setIsModalUploadVisible(false);
    };
    
    const fileSubmit = async (file) => {
        const {rootId} = foldersSharedWithMe
        const rootFolder = rootFoldersSharedToMe.find(folder => folder.id === rootId)
        const web3Token = userCurrent.web3token
        const id = uuidv4()
        if (rootFolder) {
            const {sharedPassword} = rootFolder
            window.electron.ipcRenderer.encryptThenUploadToSharedFolder(web3Token, file.path, sharedPassword, {
                filename: file.name,
                type: file.type,
                id,
                folder: foldersSharedWithMe.id, 
                privateKey: userCurrent.privateKey,
                publicKey: userCurrent.publicKey
            })
        }
    }

    
    useEffect(() => {
        const fetchData = async () => {
            await dispatch(getSharedFoldersWithMeInfo());
            const folderId = getUrlParameter('folder')
            const owner = getUrlParameter('owner')
            if (folderId && owner) {
                await dispatch(getSharedFolderById({id: folderId, owner: owner}))
            } else {
                await dispatch(getSharedFileInfo());
            }
        }
        fetchData()
    }, [])

    useEffect(() => {
        if (rootFoldersSharedToMe.length && foldersSharedWithMe?.rootId) {
            const {rootId} = foldersSharedWithMe
            const sharedDoc = rootFoldersSharedToMe.find(doc => doc.id === rootId)
            if (sharedDoc) {
                setPermission(sharedDoc.permissions)
                setRoot(sharedDoc)
            }
        } 
    }, [rootFoldersSharedToMe, foldersSharedWithMe])

    const redirectToFolder = (id, owner) => {
        if (id === owner) {
            history.push(`/shared_with_me`)
            history.go(0)
        } else {
            history.push(`/shared_with_me?folder=${id}&owner=${owner}`)
            history.go(0)
        }
        
    }

    const props = {
        name: 'file',
        multiple: true,
        onChange(info) {
            const { status } = info.file;
            if (status !== 'uploading') {
                fileSubmit(info.file.originFileObj)
            }
        },
        onDrop(e) {
            console.log('Dropped files', e.dataTransfer.files);
            fileSubmit(e.dataTransfer.files[0])
        },
    };


    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render(text, record) {
                return (
                    <div>
                        {record.isFolder  ? 
                            <a onClick={() => redirectToFolder(record.id, record.owner)}>{!record.isTop && <FolderOpenOutlined />} {record.name}</a>:
                            <a 
                                onClick={() => window.electron.ipcRenderer.openFile(userCurrent.web3token , {
                                    ...record,
                                    privateKey: userCurrent.privateKey,
                                    
                                })}
                            >
                                <FileProtectOutlined /> {record.name}
                            </a>
                        }
                    </div>
                )
            }
        },
        {
            title: 'Type',
            dataIndex: 'file_type',
        },
        {
            title: 'Owner',
            dataIndex: 'owner',
            render(text, record) {
                return <span>{record.isTop ? "" : record.owner}</span>
            }
        },
        {
            title: '',
            render(text, record) {
                return (
                    <div>
                        {record.isSharedFolderFile && permission === 2 && <SyncSharedFolderFileButton 
                            {...record} 
                            root={{...root, folder_password: root.sharedPassword}} 
                            folder={foldersSharedWithMe.id}
                        />}
                        {!record.isSharedFolderFile && !record.isTop && record.permission === 2 && <SyncSharedFileWithMeButton {...record} />}
                    </div>
                )
            }
        },
    ];

    useEffect(() => {
        const files = foldersSharedWithMe.files.map(file => {
            return {
                id: file.cid,
                ...file,
                isFolder: false,
                isSharedFolderFile: true,
            }
        })
        const folders = foldersSharedWithMe.children.map(child => {
            return {
                id: child.id,
                ...child,
                isFolder: true,
                children: null,
            }
        })
        const sharedFiles = filesSharedWithMe.map(file => {
            return {
                id: file.cid,
                ...file,
                isFolder: false,
                isSharedFolderFile: false,
            }
        })
        if (foldersSharedWithMe.owner === foldersSharedWithMe.parent) {
            setData([
                {
                    name: "...",
                    id: foldersSharedWithMe.parent,
                    owner: foldersSharedWithMe.owner,
                    isFolder: true,
                    isTop: true
                },
                ...folders, 
                ...files,
                ...sharedFiles
            ])
        } else {
            setData([
                {
                    name: "...",
                    id: foldersSharedWithMe.parent,
                    owner: foldersSharedWithMe.owner,
                    isFolder: true,
                    isTop: true
                },
                ...folders, 
                ...files,
                ...sharedFiles
            ])
        }
    }, [foldersSharedWithMe, filesSharedWithMe])

    return (
        <>
        <div>
            <div className="header">
                <h2 className="title">Shared with me</h2>
                <hr />
            </div>
            <div className="content">
            {permission === 2 && <div className="actions d-flex justify-content-end">
                    <div className="action-button">
                        <Button 
                            icon={<FolderAddOutlined style={{ fontSize: '18px' }} />} 
                            onClick={showModalCreateFolder} 
                        >
                            Create folder
                        </Button>
                        <Modal 
                            title="Create folder" 
                            visible={isModalCreateFolderVisible} 
                            onOk={handleSubmit} 
                            onCancel={handleCancelCreateFolder}
                        >
                            <label className="form-label">Folder name</label>
                            <div className="input-group mb-3">
                                <Input placeholder="Folder name" onChange={handleChange('name')} />
                            </div>
                            {errors.name && <span className="error-text">{errors.name}</span>}
                        </Modal>
                    </div>
                    <div className="action-button">
                        <Button 
                            icon={<UploadOutlined style={{ fontSize: '18px' }} />} 
                            onClick={showModalUpload}
                        >
                            Upload file
                        </Button>
                        <Modal 
                            title="Upload file" 
                            visible={isModalUploadVisible} 
                            onCancel={handleCancelUpload}
                            footer={[]}
                        >
                            <Dragger {...props}>
                                <p className="ant-upload-drag-icon">
                                    <InboxOutlined />
                                </p>
                                <p className="ant-upload-text">Click or drag file to this area to upload</p>
                                <p className="ant-upload-hint">
                                    Support for a single or bulk upload. Strictly prohibit from uploading company data or other
                                    band files
                                </p>
                            </Dragger>,
                        </Modal>
                    </div>
                </div>}
                <div className="list-items mt-3">
                    <div className="mt-3">
                        <Table 
                            columns={columns} 
                            dataSource={data} 
                            rowKey={(record) => record.id}  
                        />
                    </div>
                </div>
            </div>
        </div>
        </>
    )
}
