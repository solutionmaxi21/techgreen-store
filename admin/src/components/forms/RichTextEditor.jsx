import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './RichTextEditor.css';
import { API_BASE_URL } from '../../config/backend';

/**
 * RichTextEditor Component
 * A wrapper around React Quill for rich text editing with image support
 * 
 * @param {Object} props
 * @param {string} props.value - HTML content
 * @param {Function} props.onChange - Callback when content changes
 * @param {string} props.placeholder - Placeholder text
 * @param {number} props.maxLength - Maximum character length (optional)
 * @param {string} props.id - Input ID for accessibility
 */
const RichTextEditor = ({
    value = '',
    onChange,
    placeholder = '',
    maxLength = 50000,
    id = 'rich-text-editor'
}) => {
    const [isSourceMode, setIsSourceMode] = useState(false);
    const [charCount, setCharCount] = useState(0);
    const { t } = useTranslation();
    const quillRef = useRef(null);

    // Custom image handler: uploads to server instead of embedding base64
    const imageHandler = useCallback(() => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files?.[0];
            if (!file) return;

            const quill = quillRef.current?.getEditor();
            if (!quill) return;

            // Save cursor position
            const range = quill.getSelection(true);

            try {
                // Upload to server
                const formData = new FormData();
                formData.append('image', file);

                const response = await fetch(`${API_BASE_URL}/products/upload`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'X-Client-Type': 'admin' },
                    body: formData,
                });

                const responseData = await response.json();

                if (!response.ok || !responseData.data?.url) {
                    throw new Error(responseData.error?.message || 'Image upload failed');
                }

                // Insert uploaded image URL instead of base64
                quill.insertEmbed(range.index, 'image', responseData.data.url);
                quill.setSelection(range.index + 1);
            } catch (error) {
                console.error('Rich text image upload failed:', error);
                alert(t('errors.upload_failed', 'Image upload failed') + ': ' + error.message);
            }
        };
    }, [t]);

    // Custom toolbar configuration
    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'align': [] }],
                ['link', 'image'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        clipboard: {
            matchVisual: false
        }
    }), [imageHandler]);

    // Formats allowed in the editor
    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet',
        'align',
        'link', 'image'
    ];

    // Calculate current character count safely
    useEffect(() => {
        if (!value) {
            setCharCount(0);
            return;
        }
        // Create a temp element to strip HTML tags for accurate count
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = value;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        setCharCount(text.trim().length);
    }, [value]);

    const toggleSourceMode = () => {
        setIsSourceMode(!isSourceMode);
    };

    const handleSourceChange = (e) => {
        const content = e.target.value;
        onChange(content);
    };

    // Handle content change from Quill
    const handleChange = (content, delta, source, editor) => {
        onChange(content);
    };

    return (
        <div className="rich-text-editor-wrapper">
            <div className="flex justify-end mb-2">
                <button
                    type="button"
                    onClick={toggleSourceMode}
                    className="text-xs px-3 py-1 bg-secondary text-secondary-foreground rounded hover:bg-secondary/80 transition-colors border border-border"
                >
                    {isSourceMode ? (
                        <span className="flex items-center gap-1">
                            👁️ {t('common.visualEditor', 'Visual Editor')}
                        </span>
                    ) : (
                        <span className="flex items-center gap-1">
                            💻 {t('common.sourceCode', 'Source Code')}
                        </span>
                    )}
                </button>
            </div>

            {isSourceMode ? (
                <textarea
                    id={id}
                    value={value}
                    onChange={handleSourceChange}
                    className="w-full h-64 p-4 font-mono text-sm bg-background border rounded-md focus:outline-none focus:ring-2 focus:ring-primary leading-normal resize-y"
                    placeholder={t('editor.htmlPlaceholder')}
                    spellCheck={false}
                />
            ) : (
                <ReactQuill
                    ref={quillRef}
                    id={id}
                    theme="snow"
                    value={value}
                    onChange={handleChange}
                    modules={modules}
                    formats={formats}
                    placeholder={placeholder}
                    className="rich-text-editor"
                />
            )}

            <div className="rich-text-meta">
                <span className={`char-count ${charCount > maxLength ? 'text-destructive font-bold' : 'text-muted-foreground'}`}>
                    {charCount}/{maxLength}
                </span>
                <span className="field-hint text-xs text-muted-foreground ml-4">
                    {isSourceMode
                        ? t('common.sourceHint', 'Edit HTML directly')
                        : t('wizard.step3.full_hint', 'Use toolbar to format text')}
                </span>
            </div>
        </div>
    );
};

export default RichTextEditor;
