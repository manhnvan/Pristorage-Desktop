import React from 'react';
import { 
    Button, 
    Modal, 
    Tooltip
} from 'antd'
import {
    SyncOutlined,
    ExclamationCircleOutlined
} from '@ant-design/icons'
import { useHistory } from 'react-router-dom'
import { 
    useSelector, 
    useDispatch 
} from 'react-redux';
const { confirm } = Modal

const SyncSharedFolderFileButton = (props) => {

    const history = useHistory()
    const {file_type, name, cid, id, encrypted_password, root, folder } = props;
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

    const showConfirm = () => {
        confirm({
            title: `Do you Want to sync this file?`,
            icon: <ExclamationCircleOutlined />,
            content: name,
            onOk() {
                const web3Token = userCurrent.web3token
                const {folder_password: folderPassword} = root
                window.electron.ipcRenderer.encryptThenUploadToSharedFolder(web3Token, null, folderPassword, {
                    reqType: 'sync',
                    filename: name,
                    type: file_type,
                    id,
                    cid,
                    encrypted_password,
                    folder, 
                    privateKey: userCurrent.privateKey,
                    publicKey: userCurrent.publicKey
                })
            },
            onCancel() {
            },
        });
    }


    return (
        <>
        <Tooltip title="Sync">
            <Button onClick={showConfirm} loading={loadingCurrent && commonFolderLoading}>
                <SyncOutlined />
            </Button>
        </Tooltip>
        </>
    )
}

export default SyncSharedFolderFileButton