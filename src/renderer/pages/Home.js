import React, {useState, useEffect} from 'react'
import {
    FolderAddOutlined,
    UploadOutlined,
    InboxOutlined,
    DownloadOutlined,
    ShareAltOutlined,
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
import {getFolderInfo} from '../store/slice/commonFolder.slice'
import { v4 as uuidv4 } from 'uuid';
import {wrap} from 'comlink'
import {useFormik } from 'formik';
import * as Yup from 'yup';
import {getUrlParameter} from '../utils/url.utils'
import { useHistory } from 'react-router-dom';
import ShareFileButton from '../components/ShareFileButton'
import DeleteButton from '../components/DeleteButton'
import '../style/General.css';

const { Dragger } = Upload

const folderValidationSchema = Yup.object().shape({
    name: Yup.string().required('Invalid name'),
});

export default function Home() {

    const [data, setData] = useState([])
    const history = useHistory()

    const dispatch = useDispatch()
    const {loading: commonFolderLoading, current: commonFolderCurrent} = useSelector(state => state.commonFolder)
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

    const formik = useFormik({
        initialValues: {
            name: '',
        },
        validationSchema: folderValidationSchema,
        onSubmit: async (values) => {
            const id = uuidv4()
            const currentTimeStamp = new Date().getTime()
            const folder = {
                _id: id, 
                _name: values.name, 
                _parent: commonFolderCurrent.id,
                _created_at: currentTimeStamp
            }
            const data = await window.contract.create_folder(folder)
            history.go(0)
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
    
    const handleCancelUpload = () => {
        setIsModalUploadVisible(false);
    };
    
    useEffect(() => {
        const fetchData = async () => {
            const folderId = getUrlParameter('folder')
            if (folderId) {
                dispatch(getFolderInfo(folderId))
            } else {
                const {accountId} = await window.walletConnection.account()
                dispatch(getFolderInfo(accountId))
            }
        }
        fetchData()
    }, [])

    const fileSubmit = async (file) => {
        const web3Token = userCurrent.web3token
        const password = uuidv4()
        const id = uuidv4()
        window.electron.ipcRenderer.encryptThenUpload(web3Token, file.path, password, {
            filename: file.name,
            type: file.type,
            id,
            folder: commonFolderCurrent.id, 
            privateKey: userCurrent.privateKey,
            publicKey: userCurrent.publicKey
        })
    }

    useEffect(() => {
        const files = commonFolderCurrent.files.map(file => {
            return {
                id: file.cid,
                ...file,
                isFolder: false
            }
        })
        const folders = commonFolderCurrent.children.map(child => {
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
                id: commonFolderCurrent.parent,
                isFolder: true,
                isTop: true
            },
            ...folders, 
            ...files]
        )
    }, [commonFolderCurrent])

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

    const redirectToFolder = (id) => {
        history.push(`/?folder=${id}`)
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
                            <a 
                                onClick={() => redirectToFolder(record.id)}
                            >
                                {!record.isTop && <FolderOpenOutlined />} {record.name}
                            </a> :
                            <a 
                                onClick={() => window.electron.ipcRenderer.decryptThenDownload(userCurrent.web3token , {
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
                            <Tooltip title="Download">
                                <Button
                                    onClick={async () => {
                                        console.log(record)
                                        window.electron.ipcRenderer.decryptThenDownload(
                                            userCurrent.web3token, 
                                            {
                                                ...record, 
                                                privateKey: userCurrent.privateKey
                                            }
                                        )
                                    }}
                                >
                                    <DownloadOutlined />
                                </Button>
                            </Tooltip>

                            <Tooltip title="Share">
                                <ShareFileButton {...{...record, folder: commonFolderCurrent.id}} />
                            </Tooltip>

                            <Tooltip title="Remove">
                                <DeleteButton 
                                    type="File" 
                                    name={record.name} 
                                    handleDelete={async () => {
                                        await window.contract.remove_file({_folder: commonFolderCurrent.id, _file: record.id})
                                        history.go(0)
                                    }}
                                />
                            </Tooltip>
                        </div>}
                        {record.isFolder && !record.isTop && <div className="d-flex justify-content-evenly">
                            <Tooltip title="Remove">
                                <DeleteButton 
                                    type="Folder" 
                                    name={record.name} 
                                    handleDelete={async () => {
                                        await window.contract.remove_folder({_folder: record.id})
                                        history.go(0)
                                    }}
                                />
                            </Tooltip>
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
                <h2 className="title">My folders</h2>
                <hr />
            </div>
            <div className="content">
                <div className="actions d-flex justify-content-end">
                    <div className="action-button">
                        <Button 
                            icon={<FolderAddOutlined style={{ fontSize: '18px' }} />} 
                            onClick={showModalCreateFolder} 
                            loading={commonFolderLoading} 
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
                    {commonFolderCurrent.id !== userCurrent.account && <div className="action-button">
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
