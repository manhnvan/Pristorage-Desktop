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

const SyncFileButton = (props) => {

    const history = useHistory()
    const {file_type, name, cid, id, encrypted_password } = props;
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)
    const {loading: commonFolderLoading, current: commonFolderCurrent} = useSelector(state => state.commonFolder)

    const showConfirm = () => {
        confirm({
            title: `Do you Want to update this file?`,
            icon: <ExclamationCircleOutlined />,
            content: name,
            onOk() {
                const web3Token = userCurrent.web3token
                window.electron.ipcRenderer.encryptThenUpload(web3Token, null, null, {
                    reqType: 'sync',
                    filename: name,
                    type: file_type,
                    id,
                    cid,
                    encrypted_password,
                    folder: commonFolderCurrent.id, 
                    privateKey: userCurrent.privateKey,
                    publicKey: userCurrent.publicKey
                })
            },
            onCancel() {
            },
        });
    }

    console.log(props)

    return (
        <>
        <Tooltip title="Update">
            <Button onClick={showConfirm} loading={loadingCurrent && commonFolderLoading}>
                <SyncOutlined />
            </Button>
        </Tooltip>
        </>
    )
}

export default SyncFileButton