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

    /**
     * Block: Quiz List (Danh sách Quiz)
     */
    registerBlockType('live-quiz/quiz-list', {
        title: __('Live Quiz - Danh sách', 'live-quiz'),
        description: __('Block hiển thị danh sách quiz có phân trang', 'live-quiz'),
        icon: 'list-view',
        category: 'widgets',
        keywords: [__('quiz', 'live-quiz'), __('list', 'live-quiz'), __('danh sách', 'live-quiz')],
        
        attributes: {
            perPage: {
                type: 'number',
                default: 10
            },
            showTitle: {
                type: 'boolean',
                default: true
            },
            title: {
                type: 'string',
                default: 'Danh sách Quiz'
            },
            orderBy: {
                type: 'string',
                default: 'date'
            },
            order: {
                type: 'string',
                default: 'DESC'
            }
        },
        
        edit: function(props) {
            const { attributes, setAttributes } = props;
            const { perPage, showTitle, title, orderBy, order } = attributes;
            
            return el(Fragment, {},
                el(InspectorControls, {},
                    el(PanelBody, {
                        title: __('Cài đặt hiển thị', 'live-quiz'),
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
                        }),
                        el(TextControl, {
                            label: __('Số quiz mỗi trang', 'live-quiz'),
                            type: 'number',
                            value: perPage,
                            min: 1,
                            max: 50,
                            onChange: function(value) {
                                setAttributes({ perPage: parseInt(value) || 10 });
                            }
                        }),
                        el(SelectControl, {
                            label: __('Sắp xếp theo', 'live-quiz'),
                            value: orderBy,
                            options: [
                                { label: __('Ngày tạo', 'live-quiz'), value: 'date' },
                                { label: __('Tiêu đề', 'live-quiz'), value: 'title' },
                                { label: __('Ngẫu nhiên', 'live-quiz'), value: 'rand' }
                            ],
                            onChange: function(value) {
                                setAttributes({ orderBy: value });
                            }
                        }),
                        el(SelectControl, {
                            label: __('Thứ tự', 'live-quiz'),
                            value: order,
                            options: [
                                { label: __('Giảm dần', 'live-quiz'), value: 'DESC' },
                                { label: __('Tăng dần', 'live-quiz'), value: 'ASC' }
                            ],
                            onChange: function(value) {
                                setAttributes({ order: value });
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
                            marginBottom: '20px',
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
                        // Preview quiz items
                        [1, 2, 3].map(function(i) {
                            return el('div', {
                                key: i,
                                style: {
                                    padding: '15px',
                                    marginBottom: i < 3 ? '10px' : '0',
                                    border: '1px solid #e0e0e0',
                                    borderRadius: '6px',
                                    background: '#fafafa'
                                }
                            },
                                el('h3', {
                                    style: {
                                        margin: '0 0 8px 0',
                                        fontSize: '16px',
                                        fontWeight: '600',
                                        color: '#333'
                                    }
                                }, __('Quiz mẫu ', 'live-quiz') + i),
                                el('p', {
                                    style: {
                                        margin: '0 0 10px 0',
                                        fontSize: '14px',
                                        color: '#666'
                                    }
                                }, __('Mô tả ngắn về quiz này...', 'live-quiz')),
                                el('div', {
                                    style: {
                                        display: 'flex',
                                        gap: '10px',
                                        fontSize: '12px',
                                        color: '#888'
                                    }
                                },
                                    el('span', {}, '📝 10 câu hỏi'),
                                    el('span', {}, '⏱️ 20 phút'),
                                    el('span', {}, '👥 50 học viên')
                                )
                            );
                        }),
                        el('div', {
                            style: {
                                marginTop: '15px',
                                textAlign: 'center',
                                padding: '10px',
                                background: '#f5f5f5',
                                borderRadius: '4px'
                            }
                        },
                            el('span', {
                                style: {
                                    fontSize: '13px',
                                    color: '#666'
                                }
                            }, __('Phân trang: ', 'live-quiz') + perPage + __(' quiz/trang', 'live-quiz'))
                        )
                    ),
                    el('p', {
                        style: {
                            marginTop: '10px',
                            fontSize: '12px',
                            color: '#666',
                            textAlign: 'center'
                        }
                    }, __('📚 Block hiển thị danh sách quiz với phân trang', 'live-quiz'))
                )
            );
        },
        
        save: function() {
            return null; // Server-side rendering
        }
    });

})(window.wp);
