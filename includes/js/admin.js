/**
 * Admin Panel JS for Bangla QR Payment Method WooCommerce Gateway
 */

jQuery(document).ready(function($) {
    // Safety check
    if (typeof ris_smartqr_admin_params === 'undefined' || !$('#woocommerce_ris_smartqr_qrs_table').length) {
        return;
    }

    var $hiddenInput = $('#woocommerce_ris_smartqr_qrs_table');
    var $tabsContainer = $('#smartqr-qr-admin-tabs');
    var $panelsContainer = $('#smartqr-qr-admin-panels');

    var activeQrIndex = 0;
    var qrs = [];

    // Parse initial QR accounts data
    try {
        var rawVal = $hiddenInput.val();
        if (rawVal) {
            qrs = JSON.parse(rawVal);
        }
    } catch (e) {
        console.error('Failed to parse QR accounts data: ', e);
    }

    if (!Array.isArray(qrs)) {
        qrs = [];
    }

    // Helper to escape attributes
    function escapeAttr(str) {
        if (!str) return '';
        return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }

    // Generate HTML for a single tab trigger
    function renderTab(qr, idx) {
        var qrName = qr.qr_name || '';
        var qrCodeUrl = qr.qr_code_url || '';
        var active = (qr.is_active === 'yes');

        var activeCls = (idx === activeQrIndex) ? 'active' : '';
        var disabledCls = active ? '' : 'tab-disabled';
        
        var logoHtml = qrCodeUrl 
            ? '<img src="' + escapeAttr(qrCodeUrl) + '" />' 
            : '<span class="dashicons dashicons-qr-code" style="font-size: 18px; width:18px; height:18px;"></span>';

        var html = '';
        html += '<div class="smartqr-qr-admin-tab ' + activeCls + ' ' + disabledCls + '" data-index="' + idx + '">';
        html += '  <span class="sort-handle" title="Drag to reorder"><span class="dashicons dashicons-menu"></span></span>';
        html += '  <div class="smartqr-tab-logo-preview">' + logoHtml + '</div>';
        html += '  <span class="smartqr-tab-bank-title">' + (qrName ? escapeAttr(qrName) : 'New QR Code') + '</span>';
        html += '</div>';
        return html;
    }

    // Generate HTML for a single panel form
    function renderPanel(qr, idx) {
        var qrName = qr.qr_name || '';
        var qrCodeUrl = qr.qr_code_url || '';
        var active = (qr.is_active === 'yes');

        var checkedStr = active ? 'checked' : '';
        var panelActiveCls = (idx === activeQrIndex) ? 'active' : '';
        
        var qrPreview = qrCodeUrl 
            ? '<img src="' + escapeAttr(qrCodeUrl) + '" />' 
            : '<span class="dashicons dashicons-qr-code" style="font-size: 24px; width:24px; height:24px;"></span>';

        var html = '';
        html += '<div class="smartqr-qr-admin-panel ' + panelActiveCls + '" data-index="' + idx + '">';
        
        // Inline Panel Header
        html += '  <div class="smartqr-panel-header-inline">';
        html += '    <h3 style="margin:0 !important; font-size:13px !important; font-weight:700 !important; color:#0f172a !important; padding:0 !important; text-transform:uppercase; letter-spacing:0.5px;">QR Account #' + (idx + 1) + ' Details</h3>';
        html += '    <div class="smartqr-card-actions">';
        html += '      <div class="smartqr-toggle-wrapper">';
        html += '        <label class="smartqr-switch">';
        html += '          <input type="checkbox" class="smartqr-is-active-input" ' + checkedStr + ' />';
        html += '          <span class="smartqr-slider"></span>';
        html += '        </label>';
        html += '        <span class="smartqr-toggle-status">' + (active ? 'Active' : 'Inactive') + '</span>';
        html += '      </div>';
        html += '      <button type="button" class="smartqr-delete-card-btn" title="Delete QR Account">';
        html += '        <span class="dashicons dashicons-trash"></span> Delete';
        html += '      </button>';
        html += '    </div>';
        html += '  </div>';

        // Card Body (Two-Column Flex Container)
        html += '  <div class="smartqr-card-body">';
        
        // Left Column: Scan Preview
        var largePreviewStyle = qrCodeUrl ? 'display: block;' : 'display: none;';
        html += '    <div class="smartqr-large-qr-preview-wrapper" style="' + largePreviewStyle + '">';
        html += '      <label>QR Code Scan Preview</label>';
        html += '      <div class="smartqr-large-qr-preview-box">';
        html += '        <img class="smartqr-large-qr-preview-img" src="' + escapeAttr(qrCodeUrl) + '" />';
        html += '      </div>';
        html += '      <span style="font-size: 11px; color: #64748b; margin-top: 6px; display: block; line-height: 1.4;">You can scan this preview directly from your screen to verify the QR works.</span>';
        html += '    </div>';

        // Right Column: Input Fields
        html += '    <div class="smartqr-card-inputs-wrapper">';
        
        // Grid Field: QR Account Name
        html += '      <div class="smartqr-grid-field">';
        html += '        <label>QR Code Name <span class="req">*</span></label>';
        html += '        <input type="text" class="smartqr-qr-name-input" value="' + escapeAttr(qrName) + '" placeholder="e.g. bKash QR, Nagad QR" />';
        html += '      </div>';
        
        // Grid Field: Payment Charge (%)
        var qrCharge = qr.payment_charge || '0';
        html += '      <div class="smartqr-grid-field">';
        html += '        <label>Payment Charge (%)</label>';
        html += '        <input type="text" class="smartqr-payment-charge-input" value="' + escapeAttr(qrCharge) + '" placeholder="e.g. 2 (leave 0 to disable)" />';
        html += '        <span style="font-size:11px; color:#64748b; margin-top:2px; display:block;">Percentage bank fee added to checkout total when this QR is active.</span>';
        html += '      </div>';
        
        // Grid Field: QR Image Upload
        html += '      <div class="smartqr-grid-field">';
        html += '        <label>QR Code Image <span class="req">*</span></label>';
        html += '        <div class="smartqr-uploader-inline">';
        html += '          <div class="smartqr-logo-preview-box smartqr-qr-preview-box">' + qrPreview + '</div>';
        html += '          <input type="text" class="smartqr-qr-code-url-input" value="' + escapeAttr(qrCodeUrl) + '" placeholder="Paste image URL or upload" />';
        html += '          <button type="button" class="button button-secondary smartqr-upload-logo-btn">Upload</button>';
        html += '        </div>';
        html += '      </div>';

        html += '    </div>'; // End Right Column
        html += '  </div>'; // End Card Body
        html += '</div>'; // End Panel

        return html;
    }

    // Refresh layout in the DOM
    function renderTable() {
        $tabsContainer.empty();
        $panelsContainer.empty();

        if (qrs.length === 0) {
            // Render the default Test QR card if all are deleted/empty
            addQrCard(true);
            return;
        }

        // Adjust active index if it's out of range
        if (activeQrIndex >= qrs.length) {
            activeQrIndex = 0;
        }

        // Render each active QR tab and panel
        $.each(qrs, function(idx, qr) {
            $tabsContainer.append(renderTab(qr, idx));
            $panelsContainer.append(renderPanel(qr, idx));
        });

        // Append the Inline Add button directly at the end of the tabs list
        var addBtnHtml = '';
        addBtnHtml += '<button type="button" class="smartqr-btn-add-inline" id="smartqr-add-qr-row-inline" title="Add New QR Code">';
        addBtnHtml += '  <span class="dashicons dashicons-plus"></span>';
        addBtnHtml += '</button>';
        $tabsContainer.append(addBtnHtml);

        serializeData();
    }

    // Add new card data model
    function addQrCard(isDefaultTest) {
        var makeActive = qrs.length === 0 ? 'yes' : 'no';
        var newQr;

        if (isDefaultTest) {
            newQr = {
                qr_name: 'Test QR',
                qr_code_url: ris_smartqr_admin_params.default_qr_url || '',
                payment_charge: '1',
                is_active: 'yes'
            };
        } else {
            newQr = {
                qr_name: '',
                qr_code_url: '',
                payment_charge: '0',
                is_active: makeActive
            };
        }

        qrs.push(newQr);
        activeQrIndex = qrs.length - 1; // Focus newly created QR tab
        renderTable();
    }

    // Read DOM panel inputs and serialize to JSON
    function serializeData() {
        var serialized = [];
        $panelsContainer.find('.smartqr-qr-admin-panel').each(function() {
            var $panel = $(this);
            var qr = {
                qr_name: $panel.find('.smartqr-qr-name-input').val().trim(),
                qr_code_url: $panel.find('.smartqr-qr-code-url-input').val().trim(),
                payment_charge: $panel.find('.smartqr-payment-charge-input').val().trim() || '0',
                is_active: $panel.find('.smartqr-is-active-input').is(':checked') ? 'yes' : 'no'
            };
            serialized.push(qr);
        });
        qrs = serialized;
        $hiddenInput.val(JSON.stringify(serialized));
    }

    // Handle bank logo media uploader frame
    $(document).on('click', '.smartqr-upload-logo-btn', function(e) {
        e.preventDefault();
        var $btn = $(this);
        var $panel = $btn.closest('.smartqr-qr-admin-panel');
        var idx = $panel.data('index');
        var $previewBox = $panel.find('.smartqr-qr-preview-box');
        var $urlInput = $panel.find('.smartqr-qr-code-url-input');

        var fileFrame = wp.media({
            title: ris_smartqr_admin_params.media_title,
            button: {
                text: ris_smartqr_admin_params.media_button_text
            },
            multiple: false
        });

        fileFrame.on('select', function() {
            var attachment = fileFrame.state().get('selection').first().toJSON();
            var imageUrl = attachment.url;
            
            $urlInput.val(imageUrl);
            $previewBox.html('<img src="' + escapeAttr(imageUrl) + '" />');
            
            // Sync to the active tab logo preview
            $('.smartqr-qr-admin-tab[data-index="' + idx + '"] .smartqr-tab-logo-preview').html('<img src="' + escapeAttr(imageUrl) + '" />');
            
            // Sync and show the large scanner preview
            var $largeWrapper = $panel.find('.smartqr-large-qr-preview-wrapper');
            $largeWrapper.find('.smartqr-large-qr-preview-img').attr('src', imageUrl);
            $largeWrapper.show();

            serializeData();
        });

        fileFrame.open();
    });

    // Delete row event
    $(document).on('click', '.smartqr-delete-card-btn', function(e) {
        e.preventDefault();
        if (confirm(ris_smartqr_admin_params.confirm_delete)) {
            var $panel = $(this).closest('.smartqr-qr-admin-panel');
            var idx = parseInt($panel.data('index'), 10);
            
            qrs.splice(idx, 1);
            
            // Reset active tab index to previous tab
            activeQrIndex = Math.max(0, idx - 1);
            
            // If the deleted QR code was active, default another QR code to active if list is not empty
            var hasActive = false;
            $.each(qrs, function(i, q) {
                if (q.is_active === 'yes') {
                    hasActive = true;
                    return false;
                }
            });
            if (!hasActive && qrs.length > 0) {
                qrs[0].is_active = 'yes';
            }
            
            renderTable();
        }
    });

    // Add Row Click triggers
    $(document).on('click', '#smartqr-add-qr-row-inline', function(e) {
        e.preventDefault();
        addQrCard();
    });

    // Tab Switching click handler
    $(document).on('click', '.smartqr-qr-admin-tab', function(e) {
        if ($(e.target).closest('.sort-handle').length) {
            return; // Ignore drag triggers
        }
        e.preventDefault();
        var index = parseInt($(this).data('index'), 10);
        activeQrIndex = index;

        // Toggle active tabs
        $('.smartqr-qr-admin-tab').removeClass('active');
        $(this).addClass('active');

        // Toggle active panels
        $('.smartqr-qr-admin-panel').removeClass('active');
        $('.smartqr-qr-admin-panel[data-index="' + index + '"]').addClass('active');
    });

    // Outer settings tab switcher
    $(document).on('click', '.smartqr-tab-trigger', function(e) {
        e.preventDefault();
        var targetPanel = $(this).data('target');
        
        // Update trigger active state
        $('.smartqr-tab-trigger').removeClass('active');
        $(this).addClass('active');
        
        // Update panel active state
        $('.smartqr-tab-panel').removeClass('active');
        $('#' + targetPanel).addClass('active');
    });

    // Dynamic Title Sync to the Tab title
    $(document).on('input', '.smartqr-qr-name-input', function() {
        var $panel = $(this).closest('.smartqr-qr-admin-panel');
        var idx = $panel.data('index');
        var name = $(this).val().trim();
        $('.smartqr-qr-admin-tab[data-index="' + idx + '"] .smartqr-tab-bank-title').text(name ? name : 'New QR Code');
    });

    // Inline URL preview sync
    $(document).on('input', '.smartqr-qr-code-url-input', function() {
        var $panel = $(this).closest('.smartqr-qr-admin-panel');
        var idx = $panel.data('index');
        var url = $(this).val().trim();
        var $previewBox = $panel.find('.smartqr-qr-preview-box');
        var $tabPreview = $('.smartqr-qr-admin-tab[data-index="' + idx + '"] .smartqr-tab-logo-preview');
        
        if (url) {
            $previewBox.html('<img src="' + escapeAttr(url) + '" />');
            $tabPreview.html('<img src="' + escapeAttr(url) + '" />');
            
            // Sync and show the large scanner preview
            var $largeWrapper = $panel.find('.smartqr-large-qr-preview-wrapper');
            $largeWrapper.find('.smartqr-large-qr-preview-img').attr('src', url);
            $largeWrapper.show();
        } else {
            $previewBox.html('<span class="dashicons dashicons-qr-code" style="font-size: 24px; width:24px; height:24px;"></span>');
            $tabPreview.html('<span class="dashicons dashicons-qr-code" style="font-size: 18px; width:18px; height:18px;"></span>');
            
            // Hide large preview
            var $largeWrapper = $panel.find('.smartqr-large-qr-preview-wrapper');
            $largeWrapper.find('.smartqr-large-qr-preview-img').attr('src', '');
            $largeWrapper.hide();
        }
    });

    // Enabled/Disable switch changes status text and tab opacity (mutually exclusive active QRs)
    $(document).on('change', '.smartqr-is-active-input', function() {
        var $panel = $(this).closest('.smartqr-qr-admin-panel');
        var idx = $panel.data('index');
        var isChecked = $(this).is(':checked');
        
        if (isChecked) {
            // Uncheck other active check boxes in the UI without recursive loops
            $('.smartqr-is-active-input').each(function() {
                var $other = $(this);
                var $otherPanel = $other.closest('.smartqr-qr-admin-panel');
                var oIdx = $otherPanel.data('index');
                if (oIdx !== idx) {
                    $other.prop('checked', false);
                    $otherPanel.find('.smartqr-toggle-status').text('Inactive');
                    $('.smartqr-qr-admin-tab[data-index="' + oIdx + '"]').addClass('tab-disabled');
                }
            });
            
            $panel.find('.smartqr-toggle-status').text('Active');
            $('.smartqr-qr-admin-tab[data-index="' + idx + '"]').removeClass('tab-disabled');
        } else {
            // User unchecked this one. Since at least one should be active, let's verify if there is any other active.
            // If none is active, we check this back or warn. For now, let's allow it, but we serialize.
            $panel.find('.smartqr-toggle-status').text('Inactive');
            $('.smartqr-qr-admin-tab[data-index="' + idx + '"]').addClass('tab-disabled');
        }
        
        serializeData();
    });

    // Serialize when textbox values change
    $(document).on('input change', '.smartqr-qr-admin-panel input[type="text"]', function() {
        serializeData();
    });

    // Enable dragging tabs horizontally using jQuery UI sortable
    $tabsContainer.sortable({
        handle: '.sort-handle',
        placeholder: 'ui-state-highlight',
        items: '.smartqr-qr-admin-tab',
        axis: 'x',
        update: function() {
            var reordered = [];
            var newActiveIndex = 0;

            $tabsContainer.find('.smartqr-qr-admin-tab').each(function(newIdx) {
                var oldIdx = parseInt($(this).data('index'), 10);
                var $panel = $('.smartqr-qr-admin-panel[data-index="' + oldIdx + '"]');
                var qr = {
                    qr_name: $panel.find('.smartqr-qr-name-input').val().trim(),
                    qr_code_url: $panel.find('.smartqr-qr-code-url-input').val().trim(),
                    payment_charge: $panel.find('.smartqr-payment-charge-input').val().trim() || '0',
                    is_active: $panel.find('.smartqr-is-active-input').is(':checked') ? 'yes' : 'no'
                };
                reordered.push(qr);

                if ($(this).hasClass('active')) {
                    newActiveIndex = newIdx;
                }
            });

            qrs = reordered;
            activeQrIndex = newActiveIndex;
            renderTable();
        }
    });

    // Toggle status text and status badge in settings tab
    $(document).on('change', '#woocommerce_ris_smartqr_enabled', function() {
        var isChecked = $(this).is(':checked');
        $(this).closest('.smartqr-form-field-row').find('.smartqr-toggle-status').text(isChecked ? 'Enabled' : 'Disabled');
        
        // Update header active badge
        var $badge = $('.smartqr-status-badge');
        if (isChecked) {
            $badge.removeClass('status-inactive').addClass('status-active');
            $badge.html('<span class="status-dot"></span> Gateway Active');
        } else {
            $badge.removeClass('status-active').addClass('status-inactive');
            $badge.html('<span class="status-dot"></span> Gateway Inactive');
        }
    });

    // Handle gateway logo media uploader frame
    $(document).on('click', '#smartqr-upload-gateway-logo-btn', function(e) {
        e.preventDefault();
        var $previewBox = $('#smartqr-gateway-logo-preview');
        var $urlInput = $('#woocommerce_ris_smartqr_gateway_logo');

        var fileFrame = wp.media({
            title: 'Select Gateway Logo',
            button: {
                text: 'Use Logo'
            },
            multiple: false
        });

        fileFrame.on('select', function() {
            var attachment = fileFrame.state().get('selection').first().toJSON();
            var imageUrl = attachment.url;
            
            $urlInput.val(imageUrl).trigger('change');
            $previewBox.html('<img src="' + escapeAttr(imageUrl) + '" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;" />');
        });

        fileFrame.open();
    });

    $(document).on('input change', '#woocommerce_ris_smartqr_gateway_logo', function() {
        var url = $(this).val().trim();
        var $previewBox = $('#smartqr-gateway-logo-preview');
        
        if (url) {
            $previewBox.html('<img src="' + escapeAttr(url) + '" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;" />');
        } else {
            $previewBox.html('<span class="dashicons dashicons-image-filter" style="color:#64748b;"></span>');
        }
    });

    // Initial render
    renderTable();
});
