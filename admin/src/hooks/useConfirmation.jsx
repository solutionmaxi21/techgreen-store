import { useState, useCallback } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { useTranslation } from 'react-i18next';

/**
 * Custom hook for displaying a confirmation modal or prompt.
 * Returns { confirm, prompt, ConfirmationDialog }.
 * 
 * Usage:
 * const { confirm, prompt, ConfirmationDialog } = useConfirmation();
 * 
 * // Confirmation
 * if (await confirm({ title: 'Delete?', message: 'Sure?' })) { ... }
 * 
 * // Prompt
 * const reason = await prompt({ title: 'Reject', message: 'Reason for rejection:' });
 * if (reason !== null) { ... }
 */
export const useConfirmation = () => {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState({
        title: '',
        message: '',
        confirmText: '',
        cancelText: '',
        isDangerous: false,
        type: 'warning',
        showInput: false,
        inputPlaceholder: '',
        inputType: 'text'
    });

    const [inputValue, setInputValue] = useState('');

    // We store the resolve function in state to call it when user interacts
    const [resolver, setResolver] = useState(null);

    const confirm = useCallback(({
        title = t('confirmation.confirmAction'),
        message = t('confirmation.proceed'),
        confirmText = t('common.confirm'),
        cancelText = t('common.cancel'),
        isDangerous = false,
        type = 'warning'
    } = {}) => {
        setInputValue('');
        setConfig({ title, message, confirmText, cancelText, isDangerous, type, showInput: false });
        setIsOpen(true);

        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, [t]);

    const prompt = useCallback(({
        title = t('confirmation.inputRequired'),
        message = t('confirmation.enterValue'),
        confirmText = t('confirmation.ok'),
        cancelText = t('common.cancel'),
        isDangerous = false,
        type = 'info',
        placeholder = '',
        initialValue = '',
        inputType = 'text'
    } = {}) => {
        setInputValue(initialValue);
        setConfig({
            title,
            message,
            confirmText,
            cancelText,
            isDangerous,
            type,
            showInput: true,
            inputPlaceholder: placeholder,
            inputType
        });
        setIsOpen(true);

        return new Promise((resolve) => {
            setResolver(() => resolve);
        });
    }, [t]);

    const handleConfirm = useCallback(() => {
        setIsOpen(false);
        if (resolver) {
            // If it was a prompt (showInput is true), return the input value. Otherwise return true.
            if (config.showInput) {
                resolver(inputValue);
            } else {
                resolver(true);
            }
            setResolver(null);
        }
    }, [resolver, inputValue, config.showInput]);

    const handleClose = useCallback(() => {
        setIsOpen(false);
        if (resolver) {
            // If it was a prompt, return null. Otherwise return false.
            if (config.showInput) {
                resolver(null); // Emulate window.prompt cancellation
            } else {
                resolver(false);
            }
            setResolver(null);
        }
    }, [resolver, config.showInput]);

    // Component to render inside the parent
    const ConfirmationDialog = useCallback(() => (
        <ConfirmationModal
            isOpen={isOpen}
            onClose={handleClose}
            onConfirm={handleConfirm}
            title={config.title}
            message={config.message}
            confirmText={config.confirmText}
            cancelText={config.cancelText}
            isDangerous={config.isDangerous}
            type={config.type}
            showInput={config.showInput}
            inputPlaceholder={config.inputPlaceholder}
            inputType={config.inputType}
            inputValue={inputValue}
            onInputChange={setInputValue}
        />
    ), [isOpen, config, inputValue, handleClose, handleConfirm]);

    return { confirm, prompt, ConfirmationDialog };
};

export default useConfirmation;
