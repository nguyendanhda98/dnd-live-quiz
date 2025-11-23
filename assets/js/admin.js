/**
 * Live Quiz Admin JavaScript
 * 
 * @package LiveQuiz
 */

(function($) {
    'use strict';
    
    const config = window.liveQuizAdmin || {};
    
    console.log('Live Quiz Admin JS loaded');
    console.log('Config:', config);
    console.log('jQuery version:', $.fn.jquery);
    
    $(document).ready(function() {
        console.log('Document ready fired');
        initSessionControls();
        initQuestionBuilder();
        initQuizFormValidation();
    });
    
    /**
     * Initialize session control buttons
     */
    function initSessionControls() {
        // Start session
        $(document).on('click', '.btn-start', function(e) {
            e.preventDefault();
            const sessionId = $(this).data('session-id');
            startSession(sessionId);
        });
        
        // Next question
        $(document).on('click', '.btn-next', function(e) {
            e.preventDefault();
            const sessionId = $(this).data('session-id');
            nextQuestion(sessionId);
        });
        
        // End session
        $(document).on('click', '.btn-end', function(e) {
            e.preventDefault();
            if (!confirm(config.i18n.confirm_end)) {
                return;
            }
            const sessionId = $(this).data('session-id');
            endSession(sessionId);
        });
    }
    
    /**
     * Start session
     */
    async function startSession(sessionId) {
        try {
            const response = await fetch(config.restUrl + '/sessions/' + sessionId + '/start', {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': config.nonce,
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotice(config.i18n.saved, 'success');
                location.reload();
            } else {
                throw new Error(data.message || 'Failed to start');
            }
        } catch (error) {
            console.error('Start error:', error);
            showNotice(error.message, 'error');
        }
    }
    
    /**
     * Next question
     */
    async function nextQuestion(sessionId) {
        try {
            const response = await fetch(config.restUrl + '/sessions/' + sessionId + '/next', {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': config.nonce,
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotice(config.i18n.saved, 'success');
                location.reload();
            } else {
                throw new Error(data.message || 'Failed to move to next');
            }
        } catch (error) {
            console.error('Next error:', error);
            showNotice(error.message, 'error');
        }
    }
    
    /**
     * End session
     */
    async function endSession(sessionId) {
        try {
            const response = await fetch(config.restUrl + '/sessions/' + sessionId + '/end', {
                method: 'POST',
                headers: {
                    'X-WP-Nonce': config.nonce,
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                showNotice(config.i18n.saved, 'success');
                location.reload();
            } else {
                throw new Error(data.message || 'Failed to end');
            }
        } catch (error) {
            console.error('End error:', error);
            showNotice(error.message, 'error');
        }
    }
    
    /**
     * Initialize question builder
     */
    function initQuestionBuilder() {
        // Check if we're on a quiz edit page
        if ($('#live-quiz-questions-container').length === 0) {
            console.log('Live Quiz: Not on quiz edit page, skipping question builder init');
            return;
        }
        
        let questionIndex = $('#questions-list .question-item').length;
        
        console.log('Live Quiz: Question builder initialized');
        console.log('Initial question count:', questionIndex);
        console.log('Container exists:', $('#live-quiz-questions-container').length > 0);
        console.log('Manual button exists:', $('#add-question-manual').length > 0);
        console.log('AI button exists:', $('#add-question-ai').length > 0);
        
        // Initialize pagination
        initPagination();
        
        // Add question manually - use event delegation
        $(document).on('click', '#add-question-manual', function(e) {
            e.preventDefault();
            console.log('Manual button clicked');
            addQuestion(questionIndex, {});
            questionIndex++;
            updatePagination();
        });
        
        // Show AI generation modal - use event delegation
        $(document).on('click', '#add-question-ai', function(e) {
            e.preventDefault();
            console.log('AI button clicked');
            $('#ai-generation-modal').addClass('show').css('display', 'flex');
        });
        
        // Cancel AI generation - use event delegation
        $(document).on('click', '#cancel-ai-generation', function(e) {
            e.preventDefault();
            $('#ai-generation-modal').removeClass('show').css('display', 'none');
            resetAIModal();
        });
        
        // Generate AI questions - use event delegation
        $(document).on('click', '#generate-ai-questions', function(e) {
            e.preventDefault();
            generateAIQuestions(questionIndex);
        });
        
        // Change question type
        $(document).on('change', '.question-type-selector', function() {
            const $questionItem = $(this).closest('.question-item');
            const type = $(this).val();
            updateQuestionChoices($questionItem, type);
        });
        
        // Remove question
        $(document).on('click', '.remove-question', function(e) {
            e.preventDefault();
            if (confirm(config.i18n.confirm_delete || 'Bạn có chắc muốn xóa câu hỏi này?')) {
                $(this).closest('.question-item').remove();
                updateQuestionNumbers();
                updatePagination();
            }
        });
        
        // Select all questions
        $(document).on('change', '#select-all-questions', function() {
            const isChecked = $(this).prop('checked');
            $('.question-item:visible .question-select-checkbox').prop('checked', isChecked);
            updateBulkDeleteButton();
        });
        
        // Individual question checkbox
        $(document).on('change', '.question-select-checkbox', function() {
            updateBulkDeleteButton();
            updateSelectAllCheckbox();
        });
        
        // Bulk delete
        $(document).on('click', '#bulk-delete-questions', function(e) {
            e.preventDefault();
            const selectedCount = $('.question-select-checkbox:checked').length;
            if (selectedCount === 0) return;
            
            if (confirm(`Bạn có chắc muốn xóa ${selectedCount} câu hỏi đã chọn?`)) {
                $('.question-select-checkbox:checked').each(function() {
                    $(this).closest('.question-item').remove();
                });
                updateQuestionNumbers();
                updatePagination();
                updateBulkDeleteButton();
                $('#select-all-questions').prop('checked', false);
            }
        });
        
        // Add choice button
        $(document).on('click', '.add-choice', function(e) {
            e.preventDefault();
            const $question = $(this).closest('.question-item');
            const questionIndex = $question.data('index');
            const $choicesList = $question.find('.choices-list');
            const currentChoices = $choicesList.find('.choice-item').length;
            const newChoiceIndex = currentChoices;
            
            // Get question type
            const questionType = $question.find('.question-type-selector').val();
            const isMultiple = questionType === 'multiple_choice';
            const inputType = isMultiple ? 'checkbox' : 'radio';
            
            const choiceHtml = `
                <div class="choice-item" data-choice-index="${newChoiceIndex}">
                    <div class="choice-controls">
                        <input type="${inputType}" 
                               name="live_quiz_questions[${questionIndex}][correct]${isMultiple ? '[]' : ''}"
                               value="${newChoiceIndex}">
                        <span class="choice-label">Đáp án ${newChoiceIndex + 1}</span>
                    </div>
                    <input type="text"
                           name="live_quiz_questions[${questionIndex}][choices][${newChoiceIndex}]"
                           placeholder="Nhập đáp án ${newChoiceIndex + 1}"
                           class="choice-text"
                           required>
                    <button type="button" class="button button-small remove-choice" title="Xóa đáp án">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
            
            $choicesList.append(choiceHtml);
            updateChoiceLabels($question);
        });
        
        // Remove choice button
        $(document).on('click', '.remove-choice', function(e) {
            e.preventDefault();
            const $question = $(this).closest('.question-item');
            const $choicesList = $question.find('.choices-list');
            const choicesCount = $choicesList.find('.choice-item').length;
            
            // Must have at least 2 choices
            if (choicesCount <= 2) {
                alert('Phải có ít nhất 2 đáp án!');
                return;
            }
            
            $(this).closest('.choice-item').remove();
            updateChoiceLabels($question);
        });
        
        // Update choice labels when question type changes
        $(document).on('change', '.question-type-selector', function() {
            const $question = $(this).closest('.question-item');
            const questionIndex = $question.data('index');
            const questionType = $(this).val();
            const isMultiple = questionType === 'multiple_choice';
            const inputType = isMultiple ? 'checkbox' : 'radio';
            
            // Update all choice inputs
            $question.find('.choice-item').each(function(index) {
                const $controls = $(this).find('.choice-controls');
                const $oldInput = $controls.find('input[type="radio"], input[type="checkbox"]');
                const isChecked = $oldInput.is(':checked');
                const value = index;
                
                const newInputHtml = `
                    <input type="${inputType}" 
                           name="live_quiz_questions[${questionIndex}][correct]${isMultiple ? '[]' : ''}"
                           value="${value}"
                           ${isChecked ? 'checked' : ''}>
                `;
                
                $oldInput.replaceWith(newInputHtml);
            });
        });
        
        // Legacy support for old add-question button
        $('#add-question').on('click', function(e) {
            e.preventDefault();
            addQuestion(questionIndex, {});
            questionIndex++;
            updatePagination();
        });
    }
    
    /**
     * Generate AI questions
     */
    async function generateAIQuestions(startIndex) {
        const type = $('#ai-question-type').val();
        let count = parseInt($('#ai-question-count').val());
        const choicesCount = parseInt($('#ai-choices-count').val());
        const content = $('#ai-question-content').val();
        
        if (!content) {
            alert('Vui lòng nhập nội dung để AI tạo câu hỏi!');
            return;
        }
        
        // Validate count - max 50 questions
        if (count < 1) {
            alert('Số lượng câu hỏi phải lớn hơn 0!');
            return;
        }
        if (count > 50) {
            alert('Số lượng câu hỏi tối đa là 50!');
            count = 50;
            $('#ai-question-count').val(50);
        }
        
        // Show progress
        $('#generate-ai-questions').prop('disabled', true);
        $('#ai-generation-progress').show();
        
        try {
            const response = await fetch(config.restUrl + '/ai/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': config.nonce,
                },
                body: JSON.stringify({
                    type: type,
                    content: content,
                    count: count,
                    choices_count: choicesCount,
                }),
            });
            
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Response data:', data);
            
            // Check if response is error
            if (!response.ok || !data.success) {
                let errorMessage = 'Không thể tạo câu hỏi';
                
                // Get error message from response
                if (data.message) {
                    errorMessage = data.message;
                } else if (data.code) {
                    errorMessage = `Lỗi: ${data.code}`;
                }
                
                // Show error in modal instead of closing it
                alert('❌ Lỗi khi tạo câu hỏi:\n\n' + errorMessage + '\n\nVui lòng kiểm tra:\n- API Key đã được cấu hình chưa\n- Nội dung có hợp lệ không\n- Max tokens có đủ không');
                throw new Error(errorMessage);
            }
            
            if (data.data && data.data.questions && data.data.questions.length > 0) {
                // Add questions to the list
                let currentIndex = startIndex;
                data.data.questions.forEach(question => {
                    addQuestion(currentIndex, question);
                    currentIndex++;
                });
                
                // Update global index
                const newQuestionCount = $('#questions-list .question-item').length;
                
                // Update pagination after adding questions
                updatePagination();
                
                // Close modal
                $('#ai-generation-modal').removeClass('show').css('display', 'none');
                resetAIModal();
                
                alert('✅ Đã tạo thành công ' + data.data.questions.length + ' câu hỏi bằng AI!');
            } else {
                alert('⚠️ Không có câu hỏi nào được tạo. Vui lòng thử lại với nội dung khác.');
                throw new Error('Không có câu hỏi được tạo');
            }
        } catch (error) {
            console.error('AI generation error:', error);
            // Error already shown in alert above
        } finally {
            $('#generate-ai-questions').prop('disabled', false);
            $('#ai-generation-progress').hide();
        }
    }
    
    /**
     * Reset AI modal
     */
    function resetAIModal() {
        $('#ai-question-type').val('single_choice');
        $('#ai-question-count').val(1);
        $('#ai-choices-count').val(4);
        $('#ai-question-content').val('');
    }
    
    /**
     * Update question choices based on type
     */
    function updateQuestionChoices($questionItem, type) {
        const $choicesContainer = $questionItem.find('.choices-container');
        const $label = $choicesContainer.find('strong');
        
        if (type === 'multiple_choice') {
            $label.text('Đáp án (có thể chọn nhiều):');
            // Change radios to checkboxes
            $choicesContainer.find('input[type="radio"]').each(function() {
                const $radio = $(this);
                const $checkbox = $('<input type="checkbox">');
                $checkbox.attr('name', $radio.attr('name') + '[]');
                $checkbox.attr('value', $radio.attr('value'));
                $checkbox.prop('checked', $radio.prop('checked'));
                $radio.replaceWith($checkbox);
            });
        } else {
            $label.text('Đáp án:');
            // Change checkboxes to radios
            $choicesContainer.find('input[type="checkbox"]').each(function() {
                const $checkbox = $(this);
                const $radio = $('<input type="radio">');
                const name = $checkbox.attr('name').replace('[]', '');
                $radio.attr('name', name);
                $radio.attr('value', $checkbox.attr('value'));
                $radio.prop('checked', $checkbox.prop('checked'));
                $checkbox.replaceWith($radio);
            });
        }
    }
    
    /**
     * Add new question
     */
    function addQuestion(index, questionData) {
        questionData = questionData || {};
        
        const type = questionData.type || 'single_choice';
        const text = questionData.text || '';
        const choices = questionData.choices || [
            {text: '', is_correct: false},
            {text: '', is_correct: false}
        ];
        const timeLimit = questionData.time_limit || 20;
        const basePoints = questionData.base_points || 1000;
        
        const isMultiple = type === 'multiple_choice';
        const inputType = isMultiple ? 'checkbox' : 'radio';
        const inputName = isMultiple ? 
            `live_quiz_questions[${index}][correct][]` : 
            `live_quiz_questions[${index}][correct]`;
        
        let choicesHtml = '';
        choices.forEach((choice, choiceIndex) => {
            const checked = choice.is_correct ? 'checked' : '';
            choicesHtml += `
                <div class="choice-item" data-choice-index="${choiceIndex}">
                    <div class="choice-controls">
                        <input type="${inputType}" 
                               name="${inputName}"
                               value="${choiceIndex}"
                               ${checked}>
                        <span class="choice-label">Đáp án ${choiceIndex + 1}</span>
                    </div>
                    <input type="text"
                           name="live_quiz_questions[${index}][choices][${choiceIndex}]"
                           placeholder="Nhập đáp án ${choiceIndex + 1}"
                           value="${escapeHtml(choice.text)}"
                           class="choice-text"
                           required>
                    <button type="button" class="button button-small remove-choice" title="Xóa đáp án">
                        <span class="dashicons dashicons-trash"></span>
                    </button>
                </div>
            `;
        });
        
        const html = `
            <div class="question-item" data-index="${index}">
                <div class="question-header">
                    <div class="question-header-left">
                        <input type="checkbox" class="question-select-checkbox" data-index="${index}">
                        <h3>Câu hỏi #<span class="question-number">${index + 1}</span></h3>
                        <select name="live_quiz_questions[${index}][type]" class="question-type-selector">
                            <option value="single_choice" ${type === 'single_choice' ? 'selected' : ''}>Single Choice</option>
                            <option value="multiple_choice" ${type === 'multiple_choice' ? 'selected' : ''}>Multiple Choice</option>
                        </select>
                    </div>
                    <span class="remove-question dashicons dashicons-trash"></span>
                </div>
                
                <input type="text" 
                       name="live_quiz_questions[${index}][text]" 
                       class="question-text widefat"
                       placeholder="Nhập nội dung câu hỏi..."
                       value="${escapeHtml(text)}"
                       required>
                
                <div class="choices-container">
                    <div class="choices-header">
                        <strong>${isMultiple ? 'Đáp án (có thể chọn nhiều):' : 'Đáp án:'}</strong>
                        <button type="button" class="button button-small add-choice" data-question-index="${index}">
                            <span class="dashicons dashicons-plus-alt2"></span> Thêm đáp án
                        </button>
                    </div>
                    <div class="choices-list">
                        ${choicesHtml}
                    </div>
                </div>
            </div>
        `;
        
        $('#questions-list').append(html);
        updateQuestionNumbers();
    }
    
    /**
     * Escape HTML
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }
    
    /**
     * Update choice labels and indices
     */
    function updateChoiceLabels($question) {
        const questionIndex = $question.data('index');
        const questionType = $question.find('.question-type-selector').val();
        const isMultiple = questionType === 'multiple_choice';
        
        $question.find('.choice-item').each(function(index) {
            $(this).attr('data-choice-index', index);
            $(this).find('.choice-label').text(`Đáp án ${index + 1}`);
            
            // Update input name and value
            const $checkbox = $(this).find('input[type="checkbox"], input[type="radio"]');
            $checkbox.attr('name', `live_quiz_questions[${questionIndex}][correct]${isMultiple ? '[]' : ''}`);
            $checkbox.attr('value', index);
            
            const $textInput = $(this).find('.choice-text');
            $textInput.attr('name', `live_quiz_questions[${questionIndex}][choices][${index}]`);
            $textInput.attr('placeholder', `Nhập đáp án ${index + 1}`);
        });
    }
    
    /**
     * Update question numbers
     */
    function updateQuestionNumbers() {
        $('#questions-list .question-item').each(function(index) {
            $(this).attr('data-index', index);
            $(this).find('.question-number').text(index + 1);
            
            // Update input names
            $(this).find('input, select, textarea').each(function() {
                const name = $(this).attr('name');
                if (name) {
                    const newName = name.replace(/\[\d+\]/, '[' + index + ']');
                    $(this).attr('name', newName);
                }
            });
            
            // Update all choice labels in this question
            updateChoiceLabels($(this));
        });
        
        // Update total count
        const totalCount = $('#questions-list .question-item').length;
        $('.questions-info').html(`Tổng: <strong>${totalCount}</strong> câu hỏi`);
    }
    
    /**
     * Initialize pagination
     */
    let currentPage = 1;
    
    function initPagination() {
        const perPage = parseInt($('#questions-list').data('per-page')) || 10;
        const totalItems = $('#questions-list .question-item').length;
        
        if (totalItems > perPage) {
            $('.questions-pagination').show();
            showPage(1);
        }
        
        // Pagination buttons
        $(document).on('click', '#first-page', function() {
            if (currentPage > 1) {
                showPage(1);
            }
        });
        
        $(document).on('click', '#prev-page', function() {
            if (currentPage > 1) {
                showPage(currentPage - 1);
            }
        });
        
        $(document).on('click', '#next-page', function() {
            const perPage = parseInt($('#questions-list').data('per-page')) || 10;
            const totalItems = $('#questions-list .question-item').length;
            const totalPages = Math.ceil(totalItems / perPage);
            
            if (currentPage < totalPages) {
                showPage(currentPage + 1);
            }
        });
        
        $(document).on('click', '#last-page', function() {
            const perPage = parseInt($('#questions-list').data('per-page')) || 10;
            const totalItems = $('#questions-list .question-item').length;
            const totalPages = Math.ceil(totalItems / perPage);
            
            if (currentPage < totalPages) {
                showPage(totalPages);
            }
        });
        
        // Go to specific page on input change/enter
        $(document).on('change keypress', '#current-page-input', function(e) {
            // If Enter key pressed, prevent form submission
            if (e.type === 'keypress') {
                if (e.which !== 13) {
                    return;
                }
                e.preventDefault(); // Prevent form submission
            }
            
            const perPage = parseInt($('#questions-list').data('per-page')) || 10;
            const totalItems = $('#questions-list .question-item').length;
            const totalPages = Math.ceil(totalItems / perPage);
            
            let pageNum = parseInt($(this).val());
            
            // Validate page number
            if (isNaN(pageNum) || pageNum < 1) {
                pageNum = 1;
            } else if (pageNum > totalPages) {
                pageNum = totalPages;
            }
            
            $(this).val(pageNum);
            
            if (pageNum !== currentPage) {
                showPage(pageNum);
            }
        });
    }
    
    function showPage(page) {
        const perPage = parseInt($('#questions-list').data('per-page')) || 10;
        const $items = $('#questions-list .question-item');
        const totalItems = $items.length;
        const totalPages = Math.ceil(totalItems / perPage);
        
        if (totalItems === 0) {
            $('.questions-pagination').hide();
            return;
        }
        
        currentPage = page;
        
        const start = (page - 1) * perPage;
        const end = start + perPage;
        
        // Hide all items, then show current page
        $items.addClass('hidden');
        $items.slice(start, end).removeClass('hidden');
        
        // Update pagination info - WordPress style: "18 items"
        $('.displaying-num').text(totalItems + ' ' + (totalItems === 1 ? 'item' : 'items'));
        
        // Update current page input and total pages
        $('#current-page-input').val(page).attr('max', totalPages);
        $('.total-pages').text(totalPages);
        
        // Update buttons state
        $('#first-page, #prev-page').prop('disabled', page === 1);
        $('#next-page, #last-page').prop('disabled', page === totalPages);
        
        // Scroll to top of questions list
        $('html, body').animate({
            scrollTop: $('#questions-list').offset().top - 100
        }, 300);
    }
    
    function updatePagination() {
        const perPage = parseInt($('#questions-list').data('per-page')) || 10;
        const totalItems = $('#questions-list .question-item').length;
        const totalPages = Math.ceil(totalItems / perPage);
        
        if (totalItems > perPage) {
            $('.questions-pagination').show();
            // If current page is beyond total pages, go to last page
            if (currentPage > totalPages) {
                showPage(totalPages > 0 ? totalPages : 1);
            } else {
                showPage(currentPage);
            }
        } else {
            $('.questions-pagination').hide();
            $('#questions-list .question-item').removeClass('hidden');
            currentPage = 1;
        }
    }
    
    /**
     * Update bulk delete button state
     */
    function updateBulkDeleteButton() {
        const selectedCount = $('.question-select-checkbox:checked').length;
        $('#bulk-delete-questions').prop('disabled', selectedCount === 0);
        
        if (selectedCount > 0) {
            $('#bulk-delete-questions').text(`Xóa đã chọn (${selectedCount})`);
        } else {
            $('#bulk-delete-questions').text('Xóa đã chọn');
        }
    }
    
    /**
     * Update select all checkbox state
     */
    function updateSelectAllCheckbox() {
        const total = $('.question-item:visible .question-select-checkbox').length;
        const checked = $('.question-item:visible .question-select-checkbox:checked').length;
        
        $('#select-all-questions').prop('checked', total > 0 && total === checked);
    }
    
    /**
     * Initialize quiz form validation
     */
    function initQuizFormValidation() {
        // Only run on quiz edit page
        if ($('#live-quiz-questions-container').length === 0) {
            return;
        }
        
        // Validate before form submit
        $('form#post').on('submit', function(e) {
            const errors = [];
            let questionNumber = 0;
            
            // Check each question
            $('#questions-list .question-item').each(function() {
                questionNumber++;
                const $question = $(this);
                const questionIndex = $question.data('index');
                const questionType = $question.find('.question-type-selector').val();
                const isMultiple = questionType === 'multiple_choice';
                
                // Skip if question text is empty (will be handled by required attribute)
                const questionText = $question.find('.question-text').val().trim();
                if (!questionText) {
                    return; // Skip validation for empty questions
                }
                
                // Check if at least one correct answer is selected
                let hasCorrectAnswer = false;
                
                if (isMultiple) {
                    // Multiple choice: check if any checkbox is checked
                    hasCorrectAnswer = $question.find('input[type="checkbox"][name*="[correct]"]:checked').length > 0;
                } else {
                    // Single choice: check if any radio is checked
                    hasCorrectAnswer = $question.find('input[type="radio"][name*="[correct]"]:checked').length > 0;
                }
                
                if (!hasCorrectAnswer) {
                    errors.push(`Câu hỏi #${questionNumber}: Vui lòng chọn ít nhất một đáp án đúng.`);
                    
                    // Highlight the question
                    $question.css({
                        'border': '2px solid #d63638',
                        'padding': '10px',
                        'margin': '10px 0',
                        'background-color': '#fff5f5'
                    });
                } else {
                    // Remove highlight if valid
                    $question.css({
                        'border': '',
                        'padding': '',
                        'margin': '',
                        'background-color': ''
                    });
                }
            });
            
            // If there are errors, prevent submit and show alert
            if (errors.length > 0) {
                e.preventDefault();
                e.stopPropagation();
                
                let errorMessage = 'Vui lòng sửa các lỗi sau trước khi lưu:\n\n';
                errorMessage += errors.join('\n');
                
                alert(errorMessage);
                
                // Scroll to first error
                const $firstError = $('#questions-list .question-item').first();
                $('html, body').animate({
                    scrollTop: $firstError.offset().top - 100
                }, 500);
                
                return false;
            }
        });
    }
    
    /**
     * Show notice
     */
    function showNotice(message, type) {
        const noticeClass = type === 'error' ? 'notice-error' : 'notice-success';
        const notice = $('<div class="notice ' + noticeClass + ' is-dismissible"><p>' + message + '</p></div>');
        
        $('.wrap h1').after(notice);
        
        setTimeout(function() {
            notice.fadeOut(function() {
                $(this).remove();
            });
        }, 3000);
    }
    
})(jQuery);
