import React, {useState, useEffect} from 'react'
import { Layout, Menu, Input, Modal, Button, message } from 'antd';
import {
    MenuUnfoldOutlined,
    MenuFoldOutlined,
    DatabaseOutlined,
    UsergroupAddOutlined,
    UserSwitchOutlined
} from '@ant-design/icons';
const { Header, Sider, Content } = Layout;
import {useFormik } from 'formik';
import * as Yup from 'yup';
import { 
    useHistory,
    Link
} from "react-router-dom";
import {entropyToMnemonic} from 'bip39'
import {fetchUserInfo, setUser} from '../store/slice/user.slice'
import { unwrapResult } from '@reduxjs/toolkit'
import { useSelector, useDispatch } from 'react-redux';
import {
    createKeyPair,
    encryptStringTypeData
} from '../utils/keypair.utils'
import _ from 'lodash';

import './layout.css'

const { TextArea } = Input;

const signupValidationSchema = Yup.object().shape({
    token: Yup.string().test('Validate password', 'Invalid Token', value => {
        return new Promise((resolve, reject) => {
            resolve(true)
        });
        
    }).required('Invalid Web3 storage token')
});

const loginValidationSchema = Yup.object().shape({
    seedPhrase: Yup.string().test('Validate password', 'Invalid password', value => {
        return value > 12
        
    }).required('Invalid Web3 storage token')
});

export default function MainLayout({children}) {

    let history = useHistory();
    const dispatch = useDispatch()

    const [collapsed, setCollapsed] = useState(false)
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isModalLoginVisible, setIsModalLoginVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [isHideLayout, setHideLayout] = useState(false);

    const {current} = useSelector(state => state.user)

    const fetchAllFileInfo = async () => {
        const {accountId} = await window.walletConnection.account() 
        const commonFiles = await window.contract.get_all_file_in_folder({folder_id: accountId})
        const rootSharedFolders = await window.contract.get_shared_folder_info({folder_id: accountId})
        const {children} = rootSharedFolders
        const sharedFolders = await Promise.all(children.map(child => {
            return window.contract.get_shared_folder_info({folder_id: child}).then(result => {
                return {...result, id: child}
            })
        }))
        const sharedFilesByFolder = await Promise.all(sharedFolders.map(folder => {
            return window.contract.get_all_file_in_shared_folder({folder_id: folder.id}).then(result => {
                return result.map(file => {
                    return {...file, encrypted_password: folder.folder_password}
                })
            })
        }))
        const sharedFiles = _.flattenDeep(sharedFilesByFolder)

        const res = await window.contract.get_shared_folder_docs_by_owner({_account_id: accountId})
        const result = res.map(folder => {
            return {
                ...folder[3],
                owner: folder[0],
                id: folder[1],
                sharedPassword: folder[2],
            }
        })
        const sharedFilesWithMeByFolder = await Promise.all(result.map(folder => {
            return window.contract.get_all_file_in_shared_folder({folder_id: folder.id}).then(result => {
                return result.map(file => {
                    return {...file[0], id: file[1], encrypted_password: folder.sharedPassword}
                })
            })
        }))

        let sharedFilesWithMe = _.flattenDeep(sharedFilesWithMeByFolder)

        const sharedFilesDocWithMe = await window.contract.get_shared_file_docs_by_owner({_account_id: accountId})
        console.log(sharedFilesDocWithMe)

        const sharedFilesTemp = sharedFilesDocWithMe.map(file => {
            return {
                ...file[3],
                owner: file[0],
                id: file[1],
                sharedPassword: file[2],
                encrypted_password: file[2]
            }
        })

        sharedFilesWithMe = [...sharedFilesWithMe, ...sharedFilesTemp]

        const myFiles = [...sharedFiles, ...commonFiles].map(file => {
            return {...file[0], id: file[1]}
        })

        console.log(myFiles, sharedFilesWithMe)

        const private_key = window.localStorage.getItem(`${accountId}_private_key`)
        window.electron.ipcRenderer.startSyncDataFromContract(current, myFiles, sharedFilesWithMe)
    }

    useEffect(() => {
        if (current?.privateKey) {
            fetchAllFileInfo()
        }
    }, [current])

    useEffect(() => {
        const checkBeforeEnter = async () => {
            const {accountId} = await window.walletConnection.account()
            if (accountId) {
                const private_key = window.localStorage.getItem(`${accountId}_private_key`)
                try {
                    const user = await window.contract.get_user({account_id: accountId})
                    if (!user) {
                        showModal()
                    } else {
                        if (!private_key) {
                            setIsModalLoginVisible(true)
                        } else {
                            const {public_key, encrypted_token} = user
                            window.electron.ipcRenderer.decryptStringTypeData(private_key, encrypted_token)
                        }
                    }
                } catch(error) {
                    console.log(error)
                }
            }
        }
        checkBeforeEnter()
        const currentURL = window.location.href
        console.log(currentURL)
        if (currentURL.includes('login')) {
            setHideLayout(true)
        } else {
            setHideLayout(false)
        }
        window.electron.ipcRenderer.on('create-account', async (args) => {
            const {accountId, 
                token,
                privateKey,
                publicKey,
                success,
                encryptedToken,
                isValid
            } = args;
            console.log(args)
            if (!isValid) {
                message.error('Token invalid')
                return
            } else if (!success) {
                message.error('Fail to sign up')
                return
            } else {
                window.localStorage.setItem(`${accountId}_private_key`, privateKey)
                window.localStorage.setItem(`${accountId}_web3_storage_token`, token)
                await window.contract.sign_up({public_key: publicKey, encrypted_token: encryptedToken})
                setIsModalVisible(false)
                history.go(0)
            }
        });
        window.electron.ipcRenderer.on('decrypt-string-data', async (args) => {
            const {accountId} = await window.walletConnection.account()
            const private_key = window.localStorage.getItem(`${accountId}_private_key`)
            const user = await window.contract.get_user({account_id: accountId})
            const {success, plaintext} = args
            if (success) {
                dispatch(setUser({
                    success,
                    publicKey: user.public_key, 
                    web3token: plaintext, 
                    account: accountId,
                    privateKey: private_key,
                    status: 0
                }))
            } else {

            }
        });
        window.electron.ipcRenderer.on('encrypt-then-upload', async (args) => {
            if (args.success) {
                const dataToStore = {
                    _folder: args.folder, 
                    _file_id: args.id,
                    _cid: args.cid, 
                    _name: args.filename, 
                    _encrypted_password: args.encryptedPassword, 
                    _file_type: args.type 
                }
                await window.contract.create_file(dataToStore)
                history.go(0)
            } else {
                message.error('Failed to upload')
            }
        });
        window.electron.ipcRenderer.on('encrypt-share-file-password', async (args) => {
            if (args.success) {
                const params = {
                    _file_id: args._file_id, 
                    _doc_id: args._doc_id, 
                    _share_with: args._share_with, 
                    _parent_folder: args._parent_folder, 
                    _password: args._password
                }
                const data = await window.contract.share_file(params)
                history.go(0)
            } else {
                message.error(args.reason)
            }
        })
    }, [])

    

    console.log(current)

    const formik = useFormik({
        initialValues: {
            token: '',
        },
        validationSchema: signupValidationSchema,
        onSubmit: async (values) => {
            const {accountId} = await window.walletConnection.account()
            window.electron.ipcRenderer.createAccount(accountId ,values.token);
        }
    })

    const loginFormik = useFormik({
        initialValues: {
            seedPhrase: '',
        },
        validationSchema: loginValidationSchema,
        onSubmit: async (values) => {
            window.localStorage.setItem(`${accountId}_private_key`, values.seedPhrase)
            history.go(0)
        }
    })

    const {values, errors, handleChange, handleSubmit, setFieldValue} = formik
    const {
        values: loginValues, 
        errors: loginErrors, 
        handleChange: loginHandleChange, 
        handleSubmit: loginHandleSubmit, 
        setFieldValue: loginSetFieldValue,
    } = loginFormik

    const toggle = () => {
        setCollapsed(!collapsed)
    }

    const showModal = () => {
        setIsModalVisible(true);
    };
    
    const handleOk = () => {
        handleSubmit()
    };
    
    const handleCancel = () => {
        setIsModalVisible(false);
    };

    const showLoginModal = () => {
        setIsModalLoginVisible(true);
    };

    const handleLoginOk = () => {

    }

    useEffect(() => {
        if (!current.success && current.status === 1) {
            showModal()
        }
    }, [current])

    const redirect = (path) => {
        history.push(path)
        history.go(0)
    }

    return (
        <div id="page-layout-trigger">
            {isHideLayout ? <div>{children}</div> : <Layout>
                <Sider trigger={null} collapsible collapsed={collapsed}>
                    <div className="logo"></div>
                    <Menu theme="dark" mode="inline">
                        <Menu.Item key="1" icon={<DatabaseOutlined />} onClick={() => redirect("/")}>
                            My Folders
                        </Menu.Item>
                        <Menu.Item key="2" icon={<UsergroupAddOutlined />} onClick={() => redirect("/shared")}>
                            Shared Folders
                        </Menu.Item>
                        <Menu.Item key="4" icon={<UserSwitchOutlined />} onClick={() => redirect("/shared_with_me")}>
                            Shared With Me
                        </Menu.Item>
                    </Menu>
                </Sider>
                <Layout className="site-layout">
                    <Header className="site-layout-background" style={{ padding: 0 }}>
                        <div className="d-flex justify-content-between">
                            <div>
                                {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
                                    className: 'trigger',
                                    onClick: toggle,
                                })}
                            </div>
                            <div className="account">
                                {current.account}
                            </div>
                        </div>
                    </Header>
                    <Content
                        className="site-layout-background"
                        style={{
                        margin: '24px 16px',
                        padding: 24,
                        minHeight: 280,
                        }}
                    >
                        {children}
                    </Content>
                </Layout>
            </Layout>}
            <Modal
                visible={isModalLoginVisible}
                title="Your password"
                onOk={loginHandleSubmit}
                footer={[
                    <Button
                        loading={loading}
                        type="primary"
                        onClick={loginHandleSubmit}
                        key="signup button"
                    >
                        Login
                    </Button>,
                ]}
            >
                <div className="input-group mb-3">
                    <label className="form-label">Password</label>
                    <TextArea 
                        placeholder="Password" 
                        onChange={loginHandleChange('seedPhrase')}
                    />
                    {loginErrors.seedPhrase && <span className="error-text">{loginErrors.seedPhrase}</span>}
                </div>
            </Modal>
            <Modal
                visible={isModalVisible}
                title="Web3 Storage token is required"
                onOk={handleOk}
                footer={[
                    <Button
                        loading={loading}
                        type="primary"
                        onClick={handleOk}
                        key="signup button"
                    >
                        Register
                    </Button>,
                ]}
            >
                <div className="input-group mb-3">
                    <label className="form-label">Web3Storage Token</label>
                    <TextArea 
                        placeholder="Web3Storage Token" 
                        onChange={handleChange('token')}
                    />
                    {errors.token && <span className="error-text">{errors.token}</span>}
                </div>
            </Modal>
        </div>
    )
}
