import React, { useState } from 'react';
import {
    AlertDialog,
    AlertDialogOverlay,
    AlertDialogBody,
    AlertDialogContent,
    AlertDialogFooter,
    AlertDialogHeader,
    Button,
    Input,
    FormControl,
    FormErrorMessage,
    FormLabel,
    Text,
    IconButton,
    useBoolean
} from '@chakra-ui/react';
import { useAppSelector } from '../../hooks';
import { FocusableElement } from '@chakra-ui/utils';
import { registerZrokEmail, setZrokToken } from 'app/utils/IpcUtils';
import { AiFillEye, AiFillEyeInvisible } from 'react-icons/ai';


interface ZrokAuthTokenDialogProps {
    onCancel?: () => void;
    onConfirm?: (token: string) => void;
    isOpen: boolean;
    modalRef: React.RefObject<FocusableElement>;
    onClose: () => void;
}

export const ZrokAuthTokenDialog = ({
    onCancel,
    onConfirm,
    isOpen,
    modalRef,
    onClose,
}: ZrokAuthTokenDialogProps): JSX.Element => {
    const zrokToken: string = (useAppSelector(state => state.config.zrok_token) ?? '');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState(zrokToken);
    const [emailError, setEmailError] = useState('');
    const [tokenError, setTokenError] = useState('');
    const [showToken, setShowToken] = useBoolean();
    const isEmailInvalid = (emailError ?? '').length > 0;
    const isTokenInvalid = (tokenError ?? '').length > 0;

    return (
        <AlertDialog
            isOpen={isOpen}
            leastDestructiveRef={modalRef}
            onClose={() => onClose()}
        >
            <AlertDialogOverlay>
                <AlertDialogContent>
                    <AlertDialogHeader fontSize='lg' fontWeight='bold'>
                        Register your Zrok Account
                    </AlertDialogHeader>

                    <AlertDialogBody>
                        <Text>In order to use Zrok, you must create a <i>free</i> account, which will generate a token for you.</Text>
                        <br />
                        <Text>
                            If you have not done so yet, enter your email address below to create an account. <b>You will receive an Email
                            giving you a link to register your account.</b> Use it to create an account and get your token.
                        </Text>
                        <br />
                        <Text>
                            Once you have your token, enter it below.
                        </Text>
                        <br />
                        <FormControl  isInvalid={isEmailInvalid}>
                            <FormLabel htmlFor='address'>Email Address</FormLabel>
                            
                            <Input
                                id='zrok_email'
                                type='email'
                                maxWidth="16em"
                                mr={3}
                                value={email}
                                onChange={(e) => {
                                    setEmailError('');
                                    setEmail(e.target.value);
                                }}
                            />
                            <Button
                                mt={'-2px'}
                                onClick={async () => {
                                    setEmailError('');
                                    if (email.trim().length === 0) {
                                        return setEmailError('Please enter an email address!');
                                    }

                                    // Validate that it's a valid email
                                    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                    if (!emailRegex.test(email)) {
                                        return setEmailError('Please enter a valid email address!');
                                    }
        
                                    try {
                                        await registerZrokEmail(email);
                                    } catch (ex: any) {
                                        const err = ex?.message ?? String(ex);
                                        setEmailError(err.substring(err.indexOf(':') + 1).trim());
                                    }
                                }}
                            >Register</Button>
                            {isEmailInvalid ? (
                                <FormErrorMessage>{emailError}</FormErrorMessage>
                            ) : null}
                        </FormControl>
                        <br />
                        <FormControl  isInvalid={isTokenInvalid}>
                            <FormLabel htmlFor='address'>Token</FormLabel>
                            
                            <Input
                                id='zrok_token'
                                maxWidth="16em"
                                type={showToken ? 'text' : 'password'}
                                mr={3}
                                value={token}
                                onChange={(e) => {
                                    setTokenError('');
                                    setToken(e.target.value);
                                }}
                            />
                            <IconButton
                                verticalAlign='top'
                                aria-label='View token'
                                icon={showToken ? <AiFillEye /> : <AiFillEyeInvisible />}
                                onClick={() => setShowToken.toggle()}
                            />
                            {isTokenInvalid ? (
                                <FormErrorMessage>{tokenError}</FormErrorMessage>
                            ) : null}
                        </FormControl>
                        <br />
                    </AlertDialogBody>

                    <AlertDialogFooter>
                        <Button
                            ref={modalRef as React.LegacyRef<HTMLButtonElement> | undefined}
                            onClick={() => {
                                if (onCancel) onCancel();
                                onClose();
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            ml={3}
                            bg='brand.primary'
                            ref={modalRef as React.LegacyRef<HTMLButtonElement> | undefined}
                            onClick={async () => {
                                setTokenError('');
                                if (token.length === 0) {
                                    setTokenError('Please enter an Auth Token!');
                                    return;
                                }
                                
                                try {
                                    await setZrokToken(token);
                                    if (onConfirm) onConfirm(token);
                                    onClose();
                                } catch (ex: any) {
                                    const err = ex?.message ?? String(ex);
                                    setTokenError(err.substring(err.indexOf(':') + 1).trim());
                                }
                            }}
                        >
                            Save
                        </Button>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialogOverlay>
        </AlertDialog>
    );
};