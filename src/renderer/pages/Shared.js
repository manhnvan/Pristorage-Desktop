import React, {useState, useEffect} from 'react'
import '../style/General.css'
import {
    FolderAddOutlined,
    UploadOutlined,
    InboxOutlined,
    DownloadOutlined,
    DeleteOutlined,
    FolderOpenOutlined,
    FileProtectOutlined
} from '@ant-design/icons';
import { 
    Button, 
    Table, 
    Modal, 
    Input, 
    Upload, 
    message, 
    Tooltip 
} from 'antd';
import { 
    useSelector, 
    useDispatch 
} from 'react-redux';
import {getSharedFolderInfo} from '../store/slice/sharedFolder.slice'
import { v4 as uuidv4 } from 'uuid';
import {wrap} from 'comlink'
import {useFormik } from 'formik';
import * as Yup from 'yup';
import {getUrlParameter} from '../utils/url.utils'
import {useHistory} from 'react-router-dom'
import ShareFolderButton from '../components/ShareFolderButton'
import DeleteButton from '../components/DeleteButton'
import SyncSharedFolderFileButton from '../components/SyncSharedFolderFileButton'

const { Dragger } = Upload;

const folderValidationSchema = Yup.object().shape({
    name: Yup.string().required('Invalid folder name'),
});

export default function Shared() {
    const [data, setData] = useState([])

    const dispatch = useDispatch()
    const history = useHistory()
    const {loading, current} = useSelector(state => state.sharedFolder)
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

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
                _parent: current.id,
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
    
    useEffect(() => {
        const fetchData = async () => {
            const folderId = getUrlParameter('folder')
            if (folderId) {
                dispatch(getSharedFolderInfo(folderId))
            } else {
                const {accountId} = await window.walletConnection.account()
                dispatch(getSharedFolderInfo(accountId))
            }
        }
        fetchData()
    }, [])

    const fileSubmit = async (file) => {
        const {root} = current
        const web3Token = userCurrent.web3token
        const id = uuidv4()
        if (root) {
            const {folder_password: folderPassword} = root
            window.electron.ipcRenderer.encryptThenUploadToSharedFolder(web3Token, file.path, folderPassword, {
                filename: file.name,
                type: file.type,
                id,
                folder: current.id, 
                privateKey: userCurrent.privateKey,
                publicKey: userCurrent.publicKey
            })
        }
    }

    useEffect(() => {
        const files = current.files.map(file => {
            return {
                id: file.cid,
                ...file,
                isFolder: false
            }
        })
        const folders = current.children.map(child => {
            return {
                id: child.id,
                ...child,
                isFolder: true,
                children: null,
            }
        })
        setData([
            {
                name: "...",
                id: current.parent,
                isFolder: true,
                isTop: true
            },
            ...folders, 
            ...files]
        )
    }, [current])

    const props = {
        name: 'file',
        multiple: false,
        onChange(info) {
            const { status } = info.file;
            if (status !== 'uploading') {
                fileSubmit(info.file.originFileObj)
            }
        },
        onDrop(e) {
            console.log('Dropped files', e.dataTransfer.files);
            // fileSubmit(e.dataTransfer.files[0])
        },
    };

    const redirectToFolder = (id) => {
        history.push(`/shared?folder=${id}`)
        history.go(0)
    }

    const columns = [
        {
            title: 'Name',
            dataIndex: 'name',
            render(text, record) {
                return (
                    <div>
                        {record.isFolder  ? 
                            <a onClick={() => redirectToFolder(record.id)}>{!record.isTop && <FolderOpenOutlined />} {record.name}</a>:
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
            title: '',
            render(text, record) {
                return (
                    <div>
                        {!record.isFolder && !record.isTop && <div className="d-flex justify-content-evenly">
                            <SyncSharedFolderFileButton {...record} root={current.root} folder={current.id} />
                            <DeleteButton 
                                type="File" 
                                name={record.name} 
                                handleDelete={async () => {
                                    window.contract.remove_shared_file({_folder: current.id, _file: record.id})
                                    history.go(0)
                                }}
                            />
                        </div>}
                        {record.isFolder && !record.isTop && <div className="d-flex justify-content-evenly">
                            {current.root === null && <ShareFolderButton {...record} />}
                            <DeleteButton 
                                type="Folder" 
                                name={record.name} 
                                handleDelete={async () => {
                                    await window.contract.remove_shared_folder({_folder: record.id})
                                    history.go(0)
                                }}
                            />
                        </div>}
                    </div>
                )
            }
        },
    ];

    return (
        <>
        <div id="homepage">
            <div className="header">
                <h2 className="title">Shared folder</h2>
                <hr />
            </div>
            <div className="content">
                <div className="actions d-flex justify-content-end">
                    <div className="action-button">
                        <Button 
                            icon={<FolderAddOutlined style={{ fontSize: '18px' }} />} 
                            onClick={showModalCreateFolder} 
                            loading={loading} 
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
                    {current.id !== userCurrent.account && <div className="action-button">
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
                                {/* <p className="ant-upload-hint">
                                    Support for a single or bulk upload. Strictly prohibit from uploading company data or other
                                    band files
                                </p> */}
                            </Dragger>,
                        </Modal>
                    </div>}
                </div>
                <div className="list-items mt-3">
                    <Table 
                        columns={columns} 
                        dataSource={data} 
                        rowKey={(record) => record.id} 
                    />
                </div>
            </div>
        </div>
        </>
    )
}
