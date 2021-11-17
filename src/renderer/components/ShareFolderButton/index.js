import React, {useState, useEffect} from 'react';
import { 
    Button, 
    Modal, 
    Input,
    Tooltip,
    Select,
    message
} from 'antd'
import {
    ShareAltOutlined,
} from '@ant-design/icons';

import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';

const {Option} = Select

const accountValidationSchema = Yup.object().shape({
    account: Yup.string().required('Invalid account id'),
    permissions: Yup.number().required('Invalid permission'),
});

const ShareFolderButton = (props) => {

    const dispatch = useDispatch()

    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

    const accountFormik = useFormik({
        initialValues: {
            account: '',
            permissions: ''
        },
        validationSchema: accountValidationSchema,
        onSubmit: async (values) => {
            const user = await window.contract.get_user({account_id: values.account})
            if (!user) {
                message.error(`User "${values.account}" not found`)
                return
            }
            const sharePublicKey = user.public_key
            const ownerPrivateKey = userCurrent.privateKey
            const encryptedPassword = props.folder_password
            
            const params = {
                _folder_id: props.id, 
                _doc_id: `${userCurrent.account}_${values.account}_${props.id}`, 
                _share_with: values.account, 
                _permissions: values.permissions
            }
            window.electron.ipcRenderer.encryptSharedFolderFilePassword(sharePublicKey, ownerPrivateKey, encryptedPassword, params)
        }
    })

    const {
        values, 
        errors, 
        handleChange, 
        handleSubmit, 
        setFieldValue
    } = accountFormik

    const [isModalShareVisible, setIsModalShareVisible] = useState(false);

    const showModalShare = () => {
        setIsModalShareVisible(true);
    };
    
    const handleCancelShare = () => {
        setIsModalShareVisible(false);
    };

    return (
        <>
        <Tooltip title="Share">
            <Button onClick={showModalShare}>
                <ShareAltOutlined />
            </Button>
        </Tooltip>
        <Modal 
            title="Share folder" 
            visible={isModalShareVisible} 
            onOk={handleSubmit} 
            onCancel={handleCancelShare}
        >
            <label className="form-label">Share with</label>
            <div className="input-group mb-3">
                <Input placeholder="Account id" onChange={handleChange('account')} />
            </div>
            {errors.account && <span className="error-text">{errors.account}</span>}

            <div className="input-group mb-3">
                <label className="form-label">Permission</label>
                <Select style={{ width: '100%' }} onChange={(val) => setFieldValue('permissions', parseInt(val))}>
                    <Option value="1">Read Only</Option>
                    <Option value="2">Edit</Option>
                </Select>
            </div>
            {errors.permissions && <span className="error-text">{errors.permissions}</span>}
        </Modal>
        </>
    )
}

export default ShareFolderButton;