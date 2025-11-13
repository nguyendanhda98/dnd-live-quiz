/**
 * Gutenberg Blocks for Live Quiz
 */

(function(wp) {
    const { registerBlockType } = wp.blocks;
    const { __ } = wp.i18n;
    const { InspectorControls } = wp.blockEditor || wp.editor;
    const { PanelBody, TextControl, ToggleControl, SelectControl } = wp.components;
    const { Fragment } = wp.element;
    const el = wp.element.createElement;

    /**
     * Block: Create Room (Tạo phòng)
     */
    registerBlockType('live-quiz/create-room', {
        title: __('Live Quiz - Tạo phòng', 'live-quiz'),
        description: __('Block để host tạo phòng quiz', 'live-quiz'),
        icon: 'welcome-learn-more',
        category: 'widgets',
        keywords: [__('quiz', 'live-quiz'), __('create', 'live-quiz'), __('host', 'live-quiz')],
        
        attributes: {
            buttonText: {
                type: 'string',
                default: 'Tạo phòng Quiz'
            },
            buttonAlign: {
                type: 'string',
                default: 'center'
            }
        },
        
        edit: function(props) {
            const { attributes, setAttributes } = props;
            const { buttonText, buttonAlign } = attributes;
            
            return el(Fragment, {},
                el(InspectorControls, {},
                    el(PanelBody, {
                        title: __('Cài đặt Block', 'live-quiz'),
                        initialOpen: true
                    },
                        el(TextControl, {
                            label: __('Text nút', 'live-quiz'),
                            value: buttonText,
                            onChange: function(value) {
                                setAttributes({ buttonText: value });
                            }
                        }),
                        el(SelectControl, {
                            label: __('Căn chỉnh', 'live-quiz'),
                            value: buttonAlign,
                            options: [
                                { label: __('Trái', 'live-quiz'), value: 'left' },
                                { label: __('Giữa', 'live-quiz'), value: 'center' },
                                { label: __('Phải', 'live-quiz'), value: 'right' }
                            ],
                            onChange: function(value) {
                                setAttributes({ buttonAlign: value });
                            }
                        })
                    )
                ),
                el('div', {
                    className: 'live-quiz-block-preview',
                    style: {
                        textAlign: buttonAlign,
                        padding: '20px',
                        background: '#f0f0f1',
                        borderRadius: '4px'
                    }
                },
                    el('div', {
                        style: {
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            padding: '15px 30px',
                            borderRadius: '8px',
                            display: 'inline-block',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }
                    }, buttonText),
                    el('p', {
                        style: {
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#666'
                        }
                    }, __('🎯 Block tạo phòng quiz cho giáo viên', 'live-quiz'))
                )
            );
        },
        
        save: function() {
            return null; // Server-side rendering
        }
    });

    /**
     * Block: Join Room (Tham gia phòng)
     */
    registerBlockType('live-quiz/join-room', {
        title: __('Live Quiz - Tham gia', 'live-quiz'),
        description: __('Block để học viên tham gia phòng quiz', 'live-quiz'),
        icon: 'groups',
        category: 'widgets',
        keywords: [__('quiz', 'live-quiz'), __('join', 'live-quiz'), __('player', 'live-quiz')],
        
        attributes: {
            title: {
                type: 'string',
                default: 'Tham gia Live Quiz'
            },
            showTitle: {
                type: 'boolean',
                default: true
            }
        },
        
        edit: function(props) {
            const { attributes, setAttributes } = props;
            const { title, showTitle } = attributes;
            
            return el(Fragment, {},
                el(InspectorControls, {},
                    el(PanelBody, {
                        title: __('Cài đặt Block', 'live-quiz'),
                        initialOpen: true
                    },
                        el(ToggleControl, {
                            label: __('Hiển thị tiêu đề', 'live-quiz'),
                            checked: showTitle,
                            onChange: function(value) {
                                setAttributes({ showTitle: value });
                            }
                        }),
                        showTitle && el(TextControl, {
                            label: __('Tiêu đề', 'live-quiz'),
                            value: title,
                            onChange: function(value) {
                                setAttributes({ title: value });
                            }
                        })
                    )
                ),
                el('div', {
                    className: 'live-quiz-block-preview',
                    style: {
                        padding: '20px',
                        background: '#f0f0f1',
                        borderRadius: '4px'
                    }
                },
                    showTitle && el('h2', {
                        style: {
                            marginBottom: '15px',
                            color: '#333'
                        }
                    }, title),
                    el('div', {
                        style: {
                            background: 'white',
                            padding: '20px',
                            borderRadius: '8px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }
                    },
                        el('div', {
                            style: {
                                marginBottom: '15px'
                            }
                        },
                            el('label', {
                                style: {
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: '600'
                                }
                            }, __('Tên hiển thị', 'live-quiz')),
                            el('input', {
                                type: 'text',
                                placeholder: __('Nhập tên của bạn...', 'live-quiz'),
                                style: {
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px'
                                },
                                disabled: true
                            })
                        ),
                        el('div', {
                            style: {
                                marginBottom: '15px'
                            }
                        },
                            el('label', {
                                style: {
                                    display: 'block',
                                    marginBottom: '5px',
                                    fontWeight: '600'
                                }
                            }, __('PIN Code', 'live-quiz')),
                            el('input', {
                                type: 'text',
                                placeholder: __('Nhập PIN 6 số...', 'live-quiz'),
                                style: {
                                    width: '100%',
                                    padding: '10px',
                                    border: '1px solid #ddd',
                                    borderRadius: '4px'
                                },
                                disabled: true
                            })
                        ),
                        el('button', {
                            style: {
                                width: '100%',
                                padding: '12px',
                                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                fontWeight: '600',
                                cursor: 'not-allowed'
                            },
                            disabled: true
                        }, __('Tham gia', 'live-quiz'))
                    ),
                    el('p', {
                        style: {
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }
                    }, __('🎮 Block tham gia phòng quiz cho học viên', 'live-quiz'))
                )
            );
        },
        
        save: function() {
            return null; // Server-side rendering
        }
    });

})(window.wp);
