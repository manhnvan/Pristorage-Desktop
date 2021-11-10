import React, {useState, useEffect} from 'react';
import { 
    Button, 
    Modal, 
    Input,
    message
} from 'antd'
import {
    ShareAltOutlined,
} from '@ant-design/icons';

import * as Yup from 'yup';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';

const accountValidationSchema = Yup.object().shape({
    account: Yup.string().required('Invalid account id'),
});

const ShareFileButton = (props) => {

    const dispatch = useDispatch()

    const {loading: loadingCurrent, current: userCurrent} = useSelector(state => state.user)

    const accountFormik = useFormik({
        initialValues: {
            account: '',
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
            const encryptedPassword = props.encrypted_password
            const docInfo = {
                _file_id: props.id, 
                _doc_id: `${userCurrent.account}_${values.account}_${props.id}`, 
                _share_with: values.account, 
                _parent_folder: props.folder, 
            }

            window.electron.ipcRenderer.encryptShareFilePassword(sharePublicKey, ownerPrivateKey, encryptedPassword, docInfo)

        }
    })

    const {
        values: accountValues, 
        errors: accountErrors, 
        handleChange: accountHandleChange, 
        handleSubmit: accountHandleSubmit, 
        setFieldValue: accountSetFieldValue
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
        <Button onClick={showModalShare}>
            <ShareAltOutlined />
        </Button>
        <Modal 
            title="Share file" 
            visible={isModalShareVisible} 
            onOk={accountHandleSubmit} 
            onCancel={handleCancelShare}
        >
            <label className="form-label">Share with</label>
            <div className="input-group mb-3">
                <Input placeholder="Account id" onChange={accountHandleChange('account')} />
            </div>
            {accountErrors.account && <span className="error-text">{accountErrors.account}</span>}
        </Modal>
        </>
    )
}

export default ShareFileButton;