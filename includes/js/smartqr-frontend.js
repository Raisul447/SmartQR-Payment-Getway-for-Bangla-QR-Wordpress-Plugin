/**
 * Frontend JS for Bangla QR Payment Method WooCommerce Gateway
 */

jQuery(document).ready(function($) {
    // Safety check: verify parameters exist
    if (typeof ris_smartqr_params === 'undefined') {
        return;
    }

    var selectedFile = null;
    var uploadInProgress = false;

    // Escaping helper
    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    function escAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Append modal HTML structure to body
    function buildModalHtml() {
        if ($('#smartqr-modal').length) {
            return; // Already built
        }

        var activeQr = ris_smartqr_params.active_qr;

        var html = '<div id="smartqr-modal" class="smartqr-modal-overlay">';
        html += '  <div class="smartqr-modal-container">';
        
        // Header
        html += '    <div class="smartqr-modal-header">';
        html += '      <div>';
        html += '        <h3>' + escHtml('Bangla QR Payment') + '</h3>';
        html += '        <p class="smartqr-modal-subtitle">' + escHtml('Scan QR & upload payment proof.') + '</p>';
        html += '      </div>';
        html += '      <button type="button" class="smartqr-modal-close" id="smartqr-modal-close-btn" aria-label="Close modal">';
        html += '        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>';
        html += '      </button>';
        html += '    </div>';

        // Body
        html += '    <div class="smartqr-modal-body">';
        html += '      <div id="smartqr-error-banner" class="smartqr-modal-error"></div>';
        
        if (activeQr && activeQr.qr_code_url) {
            // Get dynamic checkout total from DOM, fallback to localized total
            var total = '';
            var $domTotal = $('.order-total strong span.woocommerce-Price-amount, .order-total strong, .order-total .amount').first();
            if ($domTotal.length) {
                total = $domTotal.text().trim();
            }
            if (!total) {
                total = ris_smartqr_params.order_total || '0';
            }
            // Strip decimals/paisa (e.g. .00)
            total = total.replace(/\.\d+(?=\s*\D*$)/, '');

            var charge = parseFloat(ris_smartqr_params.payment_charge || '0');
            
            html += '      <div class="smartqr-payable-amount-box" style="text-align:center; padding: 6px 10px; background-color: #f8fafc; border-radius: 10px; border: 1px solid #e2e8f0; margin-bottom: 2px;">';
            html += '        <div style="font-size: 10px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.2;">Payable Amount</div>';
            html += '        <div style="font-size: 18px; font-weight: 800; color: #137833; margin: 1px 0; line-height: 1.2;">' + escHtml(total) + '</div>';
            if (charge > 0) {
                html += '        <div style="font-size: 9px; color: #475569; font-weight: 600; line-height: 1.2;">(Includes ' + charge + '% bank charge)</div>';
            } else {
                html += '        <div style="font-size: 9px; color: #475569; font-weight: 600; line-height: 1.2;">(No extra charge)</div>';
            }
            html += '      </div>';

            // QR Code Box (Click to zoom/enlarge)
            html += '      <div class="smartqr-qr-wrapper">';
            html += '        <div class="smartqr-qr-box is-zoomable" id="smartqr-qr-box" title="Click to view enlarged QR code" role="button" tabindex="0">';
            html += '          <div class="smartqr-qr-zoom-badge">';
            html += '            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>';
            html += '          </div>';
            html += '          <img src="' + escAttr(activeQr.qr_code_url) + '" alt="' + escAttr(activeQr.qr_name) + '" />';
            html += '          <div class="smartqr-qr-box-text">Scan Here to Pay</div>';
            html += '        </div>';
            html += '        <div class="smartqr-qr-zoom-hint-text">Click QR code to view large size</div>';
            html += '      </div>';
            
            // Payment Page Banner
            html += '      <div class="smartqr-payment-methods-banner" style="text-align:center; margin: 2px 0;">';
            html += '        <img src="' + escAttr(ris_smartqr_params.paymentpage_img_url) + '" alt="Accepted Payment Methods" style="max-width:100%; height:auto; display:inline-block; border-radius: 4px;" />';
            html += '      </div>';
            
            // Instruction Alert Banner
            html += '      <div class="smartqr-instruction-banner">';
            html += '        <p class="smartqr-instruction-text">Scan this QR code using your bank or financial app to make payment, then upload your receipt or provide Transaction ID below.</p>';
            html += '      </div>';
        } else {
            html += '      <div class="smartqr-modal-error" style="display:block;">';
            html += '        No active QR codes found. Please contact the site administrator.';
            html += '      </div>';
        }

        // Upload Receipt Section
        html += '      <div class="smartqr-upload-section">';
        html += '        <label class="smartqr-upload-label">' + escHtml('Upload Payment Screenshot / Receipt') + '</label>';
        html += '        <div id="smartqr-dropzone" class="smartqr-dropzone">';
        html += '          <svg class="smartqr-upload-icon" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" /></svg>';
        html += '          <span class="smartqr-upload-text">Drag & drop receipt here or click to browse</span>';
        html += '          <span class="smartqr-upload-subtext">Max size: ' + ris_smartqr_params.text_max_file_size + ' (JPEG, PNG, WEBP, GIF)</span>';
        html += '          <input type="file" id="smartqr-file-input" style="display:none;" accept="image/*" />';
        html += '        </div>';
        html += '        <div id="smartqr-file-preview-container"></div>';
        html += '      </div>';

        // Transaction ID Section (Collapsible option)
        html += '      <div class="smartqr-trx-section">';
        html += '        <div class="smartqr-trx-toggle-wrap">';
        html += '          <button type="button" class="smartqr-trx-toggle-btn" id="smartqr-trx-toggle-btn">';
        html += '            <span class="smartqr-trx-toggle-icon">';
        html += '              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>';
        html += '            </span>';
        html += '            <span class="smartqr-trx-toggle-text">Or provide your payment Transaction ID instead</span>';
        html += '          </button>';
        html += '        </div>';
        html += '        <div class="smartqr-trx-input-container" id="smartqr-trx-input-container" style="display:none;">';
        html += '          <label class="smartqr-trx-label" for="smartqr-trx-input">Payment Transaction ID / TrxID</label>';
        html += '          <div class="smartqr-trx-input-box">';
        html += '            <svg class="smartqr-trx-field-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>';
        html += '            <input type="text" id="smartqr-trx-input" class="smartqr-trx-input" placeholder="e.g. 9K28DF109X or Bank Ref" autocomplete="off" />';
        html += '          </div>';
        html += '          <span class="smartqr-trx-hint">Enter the Transaction ID or reference from your bank/MFS payment receipt.</span>';
        html += '        </div>';
        html += '      </div>';

        html += '    </div>'; // Close modal-body

        // Footer
        html += '    <div class="smartqr-modal-footer">';
        html += '      <button type="button" class="smartqr-btn smartqr-btn-cancel" id="smartqr-btn-cancel">Cancel</button>';
        html += '      <button type="button" class="smartqr-btn smartqr-btn-submit" id="smartqr-btn-submit">Confirm Payment</button>';
        html += '    </div>';

        html += '  </div>'; // Close modal-container

        // Enlarged QR Lightbox View
        if (activeQr && activeQr.qr_code_url) {
            html += '  <div id="smartqr-zoom-overlay" class="smartqr-zoom-overlay" style="display:none;">';
            html += '    <div class="smartqr-zoom-card">';
            html += '      <div class="smartqr-zoom-header">';
            html += '        <div class="smartqr-zoom-title-box">';
            html += '          <span class="smartqr-zoom-badge">' + escHtml(activeQr.qr_name || 'Bangla QR') + '</span>';
            html += '          <h4 class="smartqr-zoom-title">Scan QR Code</h4>';
            html += '        </div>';
            html += '        <button type="button" class="smartqr-zoom-close" id="smartqr-zoom-close-btn" aria-label="Close enlarged QR">';
            html += '          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>';
            html += '        </button>';
            html += '      </div>';
            html += '      <div class="smartqr-zoom-img-wrap">';
            html += '        <img src="' + escAttr(activeQr.qr_code_url) + '" alt="' + escAttr(activeQr.qr_name) + '" class="smartqr-zoom-img" />';
            html += '      </div>';
            html += '      <div class="smartqr-zoom-footer-note">Scan this QR code using your bank or financial app to make payment.</div>';
            html += '      <button type="button" class="smartqr-zoom-dismiss-btn" id="smartqr-zoom-dismiss-btn">Close Full View</button>';
            html += '    </div>';
            html += '  </div>';
        }

        html += '</div>'; // Close modal-overlay

        $('body').append(html);
        setupModalEvents();
    }

    // Bind events
    function setupModalEvents() {
        // Cancel/Close modal
        $('#smartqr-modal-close-btn, #smartqr-btn-cancel').on('click', function(e) {
            e.preventDefault();
            if (uploadInProgress) return;
            closeModal();
        });

        // Trigger file input click when clicking dropzone
        $('#smartqr-dropzone').on('click', function(e) {
            if (uploadInProgress) return;
            if (e.target.id !== 'smartqr-file-input') {
                $('#smartqr-file-input').click();
            }
        });

        // Handle file change
        $('#smartqr-file-input').on('change', function(e) {
            if (e.target.files.length > 0) {
                handleFileSelect(e.target.files[0]);
            }
        });

        // Drag and drop events
        $('#smartqr-dropzone').on('dragover', function(e) {
            e.preventDefault();
            if (uploadInProgress) return;
            $(this).addClass('risb-dragover');
        });

        $('#smartqr-dropzone').on('dragleave', function(e) {
            e.preventDefault();
            $(this).removeClass('risb-dragover');
        });

        $('#smartqr-dropzone').on('drop', function(e) {
            e.preventDefault();
            if (uploadInProgress) return;
            $(this).removeClass('risb-dragover');
            
            var files = e.originalEvent.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect(files[0]);
            }
        });

        // Open QR Zoom Lightbox
        $('#smartqr-qr-box').on('click keydown', function(e) {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') {
                return;
            }
            e.preventDefault();
            openQrZoom();
        });

        // Close QR Zoom Lightbox
        $('#smartqr-zoom-close-btn, #smartqr-zoom-dismiss-btn').on('click', function(e) {
            e.preventDefault();
            closeQrZoom();
        });

        $('#smartqr-zoom-overlay').on('click', function(e) {
            if ($(e.target).closest('.smartqr-zoom-card').length === 0) {
                closeQrZoom();
            }
        });

        // Toggle Transaction ID input field
        $('#smartqr-trx-toggle-btn').on('click', function(e) {
            e.preventDefault();
            var $container = $('#smartqr-trx-input-container');
            var $btn = $(this);

            if ($container.is(':visible')) {
                $container.slideUp(180);
                $btn.removeClass('is-open');
            } else {
                $container.slideDown(200, function() {
                    $('#smartqr-trx-input').focus();
                });
                $btn.addClass('is-open');
            }
        });

        // Submit form
        $('#smartqr-btn-submit').on('click', function(e) {
            e.preventDefault();
            if (uploadInProgress) return;

            hideError();

            var trxId = $('#smartqr-trx-input').val() ? $.trim($('#smartqr-trx-input').val()) : '';

            // User must provide at least one proof: File OR Transaction ID
            if (!selectedFile && !trxId) {
                showError(ris_smartqr_params.error_no_file);
                return;
            }

            // If file is selected, validate it
            if (selectedFile) {
                if (selectedFile.size > ris_smartqr_params.max_file_size) {
                    showError(ris_smartqr_params.error_file_too_large);
                    return;
                }

                if (!selectedFile.type.match('image.*')) {
                    showError(ris_smartqr_params.error_invalid_file);
                    return;
                }

                uploadFile(trxId);
            } else {
                // Transaction ID only (no file attached)
                submitWithTrxIdOnly(trxId);
            }
        });

        // Listen for ESC key to close zoom or modal
        $(document).on('keydown.smartqr', function(e) {
            if (e.key === 'Escape') {
                if ($('#smartqr-zoom-overlay').is(':visible')) {
                    closeQrZoom();
                } else if ($('#smartqr-modal').hasClass('risb-active') && !uploadInProgress) {
                    closeModal();
                }
            }
        });
    }

    // QR Zoom Helpers
    function openQrZoom() {
        $('#smartqr-zoom-overlay').fadeIn(200).addClass('is-active');
    }

    function closeQrZoom() {
        $('#smartqr-zoom-overlay').fadeOut(150).removeClass('is-active');
    }

    // Process file validation and rendering previews
    function handleFileSelect(file) {
        hideError();

        // Check file type
        if (!file.type.match('image.*')) {
            showError(ris_smartqr_params.error_invalid_file);
            return;
        }

        // Check file size
        if (file.size > ris_smartqr_params.max_file_size) {
            showError(ris_smartqr_params.error_file_too_large);
            return;
        }

        selectedFile = file;

        // Render preview card
        var objectUrl = URL.createObjectURL(file);
        var sizeInMb = (file.size / (1024 * 1024)).toFixed(2) + ' MB';
        
        $('#smartqr-file-preview-container').html(
            '<div class="smartqr-file-preview-card">' +
            '  <div class="smartqr-file-thumbnail" style="background-image: url(' + objectUrl + ')"></div>' +
            '  <div class="smartqr-file-info">' +
            '    <div class="smartqr-file-name" title="' + escAttr(file.name) + '">' + escHtml(file.name) + '</div>' +
            '    <div class="smartqr-file-size">' + sizeInMb + '</div>' +
            '    <div class="smartqr-progress-container" style="display:none;">' +
            '      <div class="smartqr-progress-bar" id="smartqr-progress-bar"></div>' +
            '    </div>' +
            '  </div>' +
            '  <button type="button" class="smartqr-remove-file-btn" id="smartqr-remove-file" aria-label="Remove file">' +
            '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6L6 18M6 6l12 12" /></svg>' +
            '  </button>' +
            '</div>'
        );

        // Bind delete action
        $('#smartqr-remove-file').on('click', function(e) {
            e.preventDefault();
            if (uploadInProgress) return;
            resetFileSelector();
        });
    }

    function resetFileSelector() {
        selectedFile = null;
        $('#smartqr-file-input').val('');
        $('#smartqr-file-preview-container').empty();
        hideError();
    }

    function showError(msg) {
        var $banner = $('#smartqr-error-banner');
        $banner.text(msg).fadeIn(200).addClass('smartqr-shake');
        setTimeout(function() {
            $banner.removeClass('smartqr-shake');
        }, 400);
    }

    function hideError() {
        $('#smartqr-error-banner').fadeOut(100).removeClass('smartqr-shake').empty();
    }

    function openModal() {
        $('#smartqr-modal').remove(); // Clear old structure to regenerate dynamic total and inputs
        buildModalHtml();
        resetFileSelector();
        
        // Show overlay and fade-in
        $('#smartqr-modal').addClass('risb-active');
        $('body').css('overflow', 'hidden'); // block page scrolling
    }

    function closeModal() {
        $('#smartqr-modal').removeClass('risb-active');
        $('body').css('overflow', ''); // restore scroll
    }

    // Submit with Transaction ID Only (No Image Upload)
    function submitWithTrxIdOnly(trxId) {
        uploadInProgress = true;

        var activeQrName = 'QR Payment';
        if (ris_smartqr_params.active_qr && ris_smartqr_params.active_qr.qr_name) {
            activeQrName = ris_smartqr_params.active_qr.qr_name;
        }

        // Store metadata in hidden checkout inputs
        $('#ris_smartqr_receipt_id').val('');
        $('#ris_smartqr_transaction_id').val(trxId);
        $('#ris_smartqr_selected_qr').val(activeQrName);

        // Render preview snippet on checkout page
        var previewMarkup = '<strong>QR Account:</strong> ' + escHtml(activeQrName) + '<br/><strong>Transaction ID:</strong> <span style="font-family:monospace; font-weight:700; color:#0f172a;">' + escHtml(trxId) + '</span> <a href="#" id="smartqr-change-receipt-btn" style="margin-left: 10px; color: #ef4444; text-decoration: underline; font-weight: 600;">Change</a>';
        $('#smartqr-selected-qr-preview').html(previewMarkup).show();

        var $submitBtn = $('#smartqr-btn-submit');
        $('#smartqr-btn-cancel').prop('disabled', true);
        $submitBtn.prop('disabled', true).addClass('loading').html('<span class="smartqr-spinner"></span> <span>Placing Order...</span>');

        // Submit checkout form
        uploadInProgress = false;
        $('form.checkout').submit();
    }

    // AJAX Upload and Compress (With optional TrxID)
    function uploadFile(trxId) {
        if (!selectedFile) return;

        uploadInProgress = true;
        
        // Show progress bar
        $('.smartqr-progress-container').show();
        $('#smartqr-progress-bar').css('width', '0%');

        // Disable buttons
        $('#smartqr-btn-cancel, #smartqr-remove-file').prop('disabled', true);
        var $submitBtn = $('#smartqr-btn-submit');
        $submitBtn.prop('disabled', true).addClass('loading');
        $submitBtn.html('<span class="smartqr-spinner"></span> <span>Uploading Receipt...</span>');

        // Build FormData
        var formData = new FormData();
        formData.append('action', 'ris_smartqr_upload_slip');
        formData.append('nonce', ris_smartqr_params.upload_nonce);
        formData.append('ris_smartqr_file', selectedFile);

        $.ajax({
            url: ris_smartqr_params.ajax_url,
            type: 'POST',
            data: formData,
            contentType: false,
            processData: false,
            xhr: function() {
                var myXhr = $.ajaxSettings.xhr();
                if (myXhr.upload) {
                    myXhr.upload.addEventListener('progress', function(e) {
                        if (e.lengthComputable) {
                            var percentage = Math.round((e.loaded / e.total) * 100);
                            $('#smartqr-progress-bar').css('width', percentage + '%');
                        }
                    }, false);
                }
                return myXhr;
            },
            success: function(response) {
                if (response.success) {
                    var activeQrName = 'QR Payment';
                    if (ris_smartqr_params.active_qr && ris_smartqr_params.active_qr.qr_name) {
                        activeQrName = ris_smartqr_params.active_qr.qr_name;
                    }

                    // Store details in checkout fields
                    $('#ris_smartqr_receipt_id').val(response.data.attachment_id);
                    $('#ris_smartqr_transaction_id').val(trxId || '');
                    $('#ris_smartqr_selected_qr').val(activeQrName);

                    // Render small success snippet
                    var previewMarkup = '<strong>QR Account:</strong> ' + escHtml(activeQrName) + '<br/><strong>Receipt Uploaded:</strong> <a href="' + escAttr(response.data.url) + '" target="_blank" style="color: #137833; font-weight:600;">View Screenshot</a>';
                    if (trxId) {
                        previewMarkup += '<br/><strong>Transaction ID:</strong> <span style="font-family:monospace; font-weight:700; color:#0f172a;">' + escHtml(trxId) + '</span>';
                    }
                    previewMarkup += ' <a href="#" id="smartqr-change-receipt-btn" style="margin-left: 10px; color: #ef4444; text-decoration: underline; font-weight: 600;">Change</a>';
                    
                    $('#smartqr-selected-qr-preview').html(previewMarkup).show();

                    $submitBtn.html('<span class="smartqr-spinner"></span> <span>Placing Order...</span>');

                    // Submit checkout form
                    uploadInProgress = false;
                    $('form.checkout').submit();
                } else {
                    handleUploadError(response.data ? response.data.message : 'An error occurred during file upload.');
                }
            },
            error: function() {
                handleUploadError('Network error or server unavailable. Please try again.');
            }
        });
    }

    function handleUploadError(errMsg) {
        uploadInProgress = false;
        $('.smartqr-progress-container').hide();
        $('#smartqr-progress-bar').css('width', '0%');
        
        // Re-enable actions
        $('#smartqr-btn-cancel, #smartqr-remove-file').prop('disabled', false);
        var $submitBtn = $('#smartqr-btn-submit');
        $submitBtn.prop('disabled', false).removeClass('loading');
        $submitBtn.html('Confirm Payment');
        
        showError(errMsg);
    }

    // Validate checkout required fields before triggering popup
    function validateCheckoutForm() {
        var errors = [];
        
        $('.woocommerce-NoticeGroup-checkout, .woocommerce-error').remove();
        $('form.checkout .woocommerce-invalid').removeClass('woocommerce-invalid');

        // Loop through WooCommerce required fields
        $('form.checkout .validate-required').each(function() {
            var $row = $(this);
            if (!$row.is(':visible')) {
                return;
            }
            
            var $input = $row.find('input, select, textarea');
            if ($input.length === 0) {
                return;
            }

            var val = $input.val();
            var labelText = $row.find('label').text().replace(/\*/g, '').trim();
            if (!labelText) {
                labelText = $input.attr('placeholder') || $input.attr('name') || 'Required field';
            }

            if ($input.is(':checkbox')) {
                if (!$input.is(':checked')) {
                    errors.push('<strong>' + escHtml(labelText) + '</strong> is a required field.');
                    $row.addClass('woocommerce-invalid');
                }
            } else {
                if (!val || val.trim() === '') {
                    errors.push('<strong>' + escHtml(labelText) + '</strong> is a required field.');
                    $row.addClass('woocommerce-invalid');
                } else {
                    if ($input.attr('type') === 'email' || ($input.attr('name') && $input.attr('name').indexOf('email') !== -1)) {
                        var emailReg = /^([\w-\.]+@([\w-]+\.)+[\w-]{2,4})?$/;
                        if (!emailReg.test(val)) {
                            errors.push('Please enter a valid email address for <strong>' + escHtml(labelText) + '</strong>.');
                            $row.addClass('woocommerce-invalid');
                        }
                    }
                }
            }
        });

        // Verify terms and conditions checkbox
        var $terms = $('#terms');
        if ($terms.length && $terms.is(':visible') && !$terms.is(':checked')) {
            errors.push('You must accept the terms and conditions.');
            $terms.closest('p').addClass('woocommerce-invalid');
        }

        if (errors.length > 0) {
            var errorHtml = '<div class="woocommerce-NoticeGroup woocommerce-NoticeGroup-checkout">';
            errorHtml += '  <ul class="woocommerce-error" role="alert">';
            $.each(errors, function(idx, err) {
                errorHtml += '    <li>' + err + '</li>';
            });
            errorHtml += '  </ul>';
            errorHtml += '</div>';

            var $form = $('form.checkout');
            $form.prepend(errorHtml);

            $('html, body').animate({
                scrollTop: ($form.offset().top - 100)
            }, 300);

            return false;
        }

        return true;
    }

    // Intercept checkout submit button
    $(document).on('click', 'form.checkout #place_order', function(e) {
        var activePaymentMethod = $('input[name="payment_method"]:checked').val();
        
        if (activePaymentMethod === ris_smartqr_params.gateway_id) {
            var receiptId = $('#ris_smartqr_receipt_id').val();
            var trxId = $('#ris_smartqr_transaction_id').val();
            
            // If either receipt image or transaction ID is present, allow standard form submission
            if ((receiptId && receiptId !== '') || (trxId && trxId !== '')) {
                return true;
            }
            
            if (!validateCheckoutForm()) {
                e.preventDefault();
                e.stopPropagation();
                return false;
            }
            
            e.preventDefault();
            e.stopPropagation();
            
            openModal();
            return false;
        }
    });
    
    // In case WooCommerce triggers submission via event
    $('form.checkout').on('checkout_place_order_' + ris_smartqr_params.gateway_id, function() {
        var receiptId = $('#ris_smartqr_receipt_id').val();
        var trxId = $('#ris_smartqr_transaction_id').val();
        
        if ((receiptId && receiptId !== '') || (trxId && trxId !== '')) {
            return true;
        }
        
        if (!validateCheckoutForm()) {
            return false;
        }
        
        openModal();
        return false;
    });

    // Listen to "Change" receipt/TrxID selection link on checkout page
    $(document).on('click', '#smartqr-change-receipt-btn', function(e) {
        e.preventDefault();
        $('#ris_smartqr_receipt_id').val('');
        $('#ris_smartqr_transaction_id').val('');
        $('#ris_smartqr_selected_qr').val('');
        $('#smartqr-selected-qr-preview').hide().empty();
        
        openModal();
    });

    // Listen to WooCommerce checkout errors to close the modal
    $(document.body).on('checkout_error', function() {
        closeModal();
        $('#smartqr-btn-submit').prop('disabled', false).removeClass('loading').html('Confirm Payment');
        $('#smartqr-btn-cancel, #smartqr-remove-file').prop('disabled', false);
        $('.smartqr-progress-container').hide();
    });
});
