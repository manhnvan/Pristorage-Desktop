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

const SyncSharedFileWithMeButton = (props) => {

    const history = useHistory()
    const {file_type, name, cid, id, encrypted_password, sharedPassword, owner } = props;
    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

    const showConfirm = () => {
        confirm({
            title: `Do you Want to sync this file?`,
            icon: <ExclamationCircleOutlined />,
            content: name,
            onOk() {
                console.log(props)
                const web3Token = userCurrent.web3token
                window.electron.ipcRenderer.updateFile(web3Token, {
                    filename: name,
                    type: file_type,
                    id,
                    cid,
                    owner,
                    encrypted_password: sharedPassword,
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

export default SyncSharedFileWithMeButton