<?php
/**
 * Gateway class for RIS_SmartQR
 */

defined( 'ABSPATH' ) || exit;

class RIS_SmartQR_Gateway extends WC_Payment_Gateway {

    /**
     * Constructor
     */
    public function __construct() {
        $this->id                 = 'ris_smartqr';
        $this->has_fields         = true;
        $this->method_title       = __( 'Bangla QR Payment', 'smartqr-payment-gateway-banglaqr' );
        $this->method_description = __( 'Receive payments through Bangladeshi Bank/Mobile QR codes (Bkash, Nagad, Rocket, Bank QR, etc.).', 'smartqr-payment-gateway-banglaqr' );

        // Load settings form fields and settings
        $this->init_form_fields();
        $this->init_settings();

        // Get option values
        $this->title       = $this->get_option( 'title' );
        $this->description = $this->get_option( 'description' );
        $this->enabled     = $this->get_option( 'enabled' );

        // Set the gateway icon URL for WooCommerce admin payments list
        $logo_url          = $this->get_option( 'gateway_logo', '' );
        $this->icon        = $logo_url ? $logo_url : RIS_SMARTQR_URL . 'assets/banglaqrlogo.png';

        // Action hooks
        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_checkout_assets' ) );
        add_action( 'woocommerce_checkout_process', array( $this, 'validate_checkout_fields' ) );
    }

    /**
     * Get gateway ID.
     *
     * @return string
     */
    public function get_id() {
        return $this->id;
    }

    /**
     * Define the gateway settings fields.
     */
    public function init_form_fields() {
        $this->form_fields = array(
            'enabled' => array(
                'title'   => __( 'Enable/Disable', 'smartqr-payment-gateway-banglaqr' ),
                'type'    => 'checkbox',
                'label'   => __( 'Enable Bangla QR Payment Gateway', 'smartqr-payment-gateway-banglaqr' ),
                'default' => 'no',
            ),
            'title' => array(
                'title'       => __( 'Title', 'smartqr-payment-gateway-banglaqr' ),
                'type'        => 'text',
                'description' => __( 'This controls the payment method title which the user sees during checkout.', 'smartqr-payment-gateway-banglaqr' ),
                'default'     => __( 'Bangla QR Payment', 'smartqr-payment-gateway-banglaqr' ),
                'desc_tip'    => true,
            ),
            'gateway_logo' => array(
                'title'       => __( 'Gateway Logo', 'smartqr-payment-gateway-banglaqr' ),
                'type'        => 'text',
                'description' => __( 'Upload a custom logo to show next to the title on checkout.', 'smartqr-payment-gateway-banglaqr' ),
                'default'     => RIS_SMARTQR_URL . 'assets/banglaqrlogo.png',
                'desc_tip'    => true,
            ),
            'description' => array(
                'title'       => __( 'Description', 'smartqr-payment-gateway-banglaqr' ),
                'type'        => 'textarea',
                'description' => __( 'This controls the description which the user sees during checkout.', 'smartqr-payment-gateway-banglaqr' ),
                'default'     => __( 'Scan the Bangla QR code through your bank or mobile financial services app (Bkash, Nagad, Rocket, etc.) to complete payment.', 'smartqr-payment-gateway-banglaqr' ),
                'desc_tip'    => true,
            ),
            'qrs_table' => array(
                'title'       => __( 'QR Configuration', 'smartqr-payment-gateway-banglaqr' ),
                'type'        => 'qrs_table',
                'description' => __( 'Add, configure, and set active QR codes.', 'smartqr-payment-gateway-banglaqr' ),
                'default'     => array(
                    array(
                        'qr_name'        => 'Test QR',
                        'qr_code_url'    => RIS_SMARTQR_URL . 'assets/testqr.png',
                        'payment_charge' => '1',
                        'is_active'      => 'yes',
                    )
                ),
            ),
        );
    }

    /**
     * Render the settings page with a custom tabbed dashboard.
     */
    public function admin_options() {
        wp_enqueue_media();

        $enabled        = $this->get_option( 'enabled', 'no' );
        $title          = $this->get_option( 'title', 'Bangla QR Payment' );
        $gateway_logo   = $this->get_option( 'gateway_logo' );
        if ( ! $gateway_logo ) {
            $gateway_logo = RIS_SMARTQR_URL . 'assets/banglaqrlogo.png';
        }
        $description    = $this->get_option( 'description', '' );
        $qrs            = $this->get_option( 'qrs_table', array() );

        if ( ! is_array( $qrs ) || empty( $qrs ) ) {
            $qrs = array(
                array(
                    'qr_name'        => 'Test QR',
                    'qr_code_url'    => RIS_SMARTQR_URL . 'assets/testqr.png',
                    'payment_charge' => '1',
                    'is_active'      => 'yes',
                )
            );
        }
        ?>
        <div class="smartqr-admin-dashboard-wrap">
            <!-- Header Section -->
            <div class="smartqr-dashboard-header">
                <div class="smartqr-header-info">
                    <div class="smartqr-logo-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2.5" stroke="currentColor" style="width:24px; height:24px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 15h.008v.008H15V15zm0 2.25h.008v.008H15v-.008zM17.25 15h.008v.008H17.25V15zm0 2.25h.008v.008H17.25v-.008zm-2.25 2.25h.008v.008H15v-.008zm2.25 0h.008v.008H17.25v-.008zM19.5 15h.008v.008H19.5V15zm0 2.25h.008v.008H19.5v-.008zm-2.25-4.5h.008v.008H17.25v-.008zm2.25 0h.008v.008H19.5v-.008z" />
                        </svg>
                    </div>
                    <div>
                        <h1 style="margin:0 !important; font-size: 20px !important; font-weight: 700 !important; color:#0f172a !important; line-height: 1.3 !important; padding:0 !important;"><?php esc_html_e( 'SmartQR Settings', 'smartqr-payment-gateway-banglaqr' ); ?></h1>
                        <p style="margin:4px 0 0 0 !important; color:#64748b; font-size: 13px !important;"><?php esc_html_e( 'Configure gateway options and manage customer upload receipts.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                    </div>
                </div>
                <div class="smartqr-header-actions">
                    <span class="smartqr-status-badge <?php echo $enabled === 'yes' ? 'status-active' : 'status-inactive'; ?>">
                        <span class="status-dot"></span>
                        <?php echo $enabled === 'yes' ? esc_html__( 'Gateway Active', 'smartqr-payment-gateway-banglaqr' ) : esc_html__( 'Gateway Inactive', 'smartqr-payment-gateway-banglaqr' ); ?>
                    </span>
                </div>
            </div>

            <!-- Tabbed Panel -->
            <div class="smartqr-settings-panel">
                <div class="smartqr-panel-tabs">
                    <a href="javascript:void(0);" class="smartqr-tab-trigger active" data-target="smartqr-qrs-tab-panel"><?php esc_html_e( 'QR Accounts Manager', 'smartqr-payment-gateway-banglaqr' ); ?></a>
                    <a href="javascript:void(0);" class="smartqr-tab-trigger" data-target="smartqr-general-tab-panel"><?php esc_html_e( 'Gateway Settings', 'smartqr-payment-gateway-banglaqr' ); ?></a>
                </div>

                <div class="smartqr-panel-content">
                    <!-- QR Accounts Tab -->
                    <div class="smartqr-tab-panel active" id="smartqr-qrs-tab-panel">
                        <div class="smartqr-panel-header">
                            <h2 style="margin: 0 0 6px 0 !important; font-size:16px !important; font-weight:700 !important; color:#0f172a !important; padding:0 !important;"><?php esc_html_e( 'Manage QR Accounts', 'smartqr-payment-gateway-banglaqr' ); ?></h2>
                            <p style="margin:0 !important; color:#64748b; font-size:13px !important;"><?php esc_html_e( 'Add QR codes that customers can scan. Only one QR can be active at a time.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                        </div>

                        <div class="smartqr-qr-admin-tabs-wrapper">
                            <!-- Horizontal selector list -->
                            <div class="smartqr-qr-admin-tabs" id="smartqr-qr-admin-tabs">
                                <!-- Populated dynamically by admin.js -->
                            </div>
                            
                            <!-- Panel form views -->
                            <div class="smartqr-qr-admin-panels" id="smartqr-qr-admin-panels">
                                <!-- Populated dynamically by admin.js -->
                            </div>
                        </div>

                        <!-- Hidden JSON field for QRs -->
                        <input type="hidden" name="woocommerce_ris_smartqr_qrs_table" id="woocommerce_ris_smartqr_qrs_table" value="<?php echo esc_attr( wp_json_encode( $qrs ) ); ?>" />
                    </div>

                    <!-- General Tab -->
                    <div class="smartqr-tab-panel" id="smartqr-general-tab-panel">
                        <div class="smartqr-tab-panel-inner">
                            <div class="smartqr-panel-header">
                                <h2 style="margin: 0 0 6px 0 !important; font-size:16px !important; font-weight:700 !important; color:#0f172a !important; padding:0 !important;"><?php esc_html_e( 'General Gateway Settings', 'smartqr-payment-gateway-banglaqr' ); ?></h2>
                                <p style="margin:0 !important; color:#64748b; font-size:13px !important;"><?php esc_html_e( 'Configure core gateway titles and settings.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                            </div>

                            <!-- General Tab Content (Two-Column Flex Container) -->
                            <div class="smartqr-card-body">
                                
                                <!-- Left Column: Gateway Enable and Logo Settings -->
                                <div class="smartqr-card-inputs-wrapper" style="width: 320px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px;">
                                    
                                    <!-- Enable/Disable Gateway -->
                                    <div class="smartqr-form-field-row" style="margin-bottom: 0; padding-bottom: 12px; border-bottom: 1px solid #f1f5f9; display: flex; gap: 16px; align-items: center;">
                                        <div class="smartqr-toggle-wrapper">
                                            <label class="smartqr-switch">
                                                <input type="checkbox" name="woocommerce_ris_smartqr_enabled" id="woocommerce_ris_smartqr_enabled" value="yes" <?php checked( $enabled, 'yes' ); ?> />
                                                <span class="smartqr-slider"></span>
                                            </label>
                                            <span class="smartqr-toggle-status"><?php echo $enabled === 'yes' ? 'Enabled' : 'Disabled'; ?></span>
                                        </div>
                                        <div class="smartqr-toggle-desc" style="display: flex; flex-direction: column;">
                                            <label for="woocommerce_ris_smartqr_enabled" class="smartqr-field-title-label" style="font-weight: 600; font-size: 13px; color: var(--smartqr-text);"><?php esc_html_e( 'Enable Gateway', 'smartqr-payment-gateway-banglaqr' ); ?></label>
                                            <p style="margin:2px 0 0 0; color:#64748b; font-size:12px;"><?php esc_html_e( 'Show gateway on checkout.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                                        </div>
                                    </div>

                                    <!-- Gateway Logo URL -->
                                    <div class="smartqr-grid-field" style="margin-top: 4px;">
                                        <label for="woocommerce_ris_smartqr_gateway_logo" style="font-weight: 600; font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;"><?php esc_html_e( 'Gateway Logo Image', 'smartqr-payment-gateway-banglaqr' ); ?></label>
                                        <div class="smartqr-uploader-inline" style="display: flex; gap: 8px; align-items: center; width: 100%;">
                                            <div class="smartqr-logo-preview-box" id="smartqr-gateway-logo-preview" style="width: 38px; height: 38px; border: 1px solid #cbd5e1; border-radius: 8px; background-color: #f8fafc; display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px; box-sizing: border-box; flex-shrink: 0;">
                                                <?php if ( $gateway_logo ) : ?>
                                                    <img src="<?php echo esc_url( $gateway_logo ); ?>" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 4px;" />
                                                <?php else : ?>
                                                    <span class="dashicons dashicons-image-filter" style="color:#64748b;"></span>
                                                <?php endif; ?>
                                            </div>
                                            <input type="text" name="woocommerce_ris_smartqr_gateway_logo" id="woocommerce_ris_smartqr_gateway_logo" value="<?php echo esc_attr( $gateway_logo ); ?>" placeholder="<?php esc_attr_e( 'Logo URL or upload', 'smartqr-payment-gateway-banglaqr' ); ?>" style="flex: 1; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 13px; height: 38px; box-sizing: border-box; margin: 0 !important;" />
                                            <button type="button" class="button button-secondary" id="smartqr-upload-gateway-logo-btn" style="height: 38px; border-radius: 8px; margin: 0 !important; font-weight: 600; font-size: 12px; padding: 0 16px; flex-shrink: 0;"><?php esc_html_e( 'Upload', 'smartqr-payment-gateway-banglaqr' ); ?></button>
                                        </div>
                                        <p class="smartqr-field-tip" style="margin:4px 0 0 0; color:#64748b; font-size:12px;"><?php esc_html_e( 'Logo next to title on checkout.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                                    </div>
                                </div>

                                <!-- Right Column: Gateway Title and Description -->
                                <div class="smartqr-card-inputs-wrapper">
                                    
                                    <!-- Gateway Title -->
                                    <div class="smartqr-grid-field">
                                        <label for="woocommerce_ris_smartqr_title" style="font-weight: 600; font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;"><?php esc_html_e( 'Gateway Title (Checkout Display)', 'smartqr-payment-gateway-banglaqr' ); ?> <span class="req">*</span></label>
                                        <input type="text" name="woocommerce_ris_smartqr_title" id="woocommerce_ris_smartqr_title" value="<?php echo esc_attr( $title ); ?>" placeholder="e.g. Bangla QR Payment" required class="smartqr-general-input" style="width: 100%; border: 1px solid #cbd5e1; border-radius: 8px; padding: 8px 12px; font-size: 13px; height: 38px; box-sizing: border-box;" />
                                        <p class="smartqr-field-tip" style="margin:4px 0 0 0; color:#64748b; font-size:12px;"><?php esc_html_e( 'This is the checkout payment method title seen by customers.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                                    </div>

                                    <!-- Gateway Description -->
                                    <div class="smartqr-grid-field" style="margin-top: 4px;">
                                        <label for="woocommerce_ris_smartqr_description" style="font-weight: 600; font-size: 13px; color: #1e293b; display: block; margin-bottom: 6px;"><?php esc_html_e( 'Gateway Description', 'smartqr-payment-gateway-banglaqr' ); ?></label>
                                        <textarea name="woocommerce_ris_smartqr_description" id="woocommerce_ris_smartqr_description" rows="4" placeholder="e.g. Scan the QR code to make payment..." class="smartqr-general-textarea" style="width:100%; border:1px solid #cbd5e1; border-radius:8px; padding:10px 14px; font-size:13px; font-family:inherit; min-height:100px; box-sizing:border-box;"><?php echo esc_textarea( $description ); ?></textarea>
                                        <p class="smartqr-field-tip" style="margin:4px 0 0 0; color:#64748b; font-size:12px;"><?php esc_html_e( 'The description content shown to customers under the gateway title on checkout (HTML tags are supported).', 'smartqr-payment-gateway-banglaqr' ); ?></p>
                                    </div>
                                </div> <!-- End Right Column -->
                            </div> <!-- End Card Body -->
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Validate and sanitize the QR table field.
     *
     * @param string $key Settings key.
     * @param string $value Field value.
     * @return array Sanitized array of QR codes.
     */
    public function validate_qrs_table_field( $key, $value ) {
        // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $raw_value = isset( $_POST[ $this->get_field_key( $key ) ] ) ? wp_unslash( $_POST[ $this->get_field_key( $key ) ] ) : '';
        $decoded   = json_decode( html_entity_decode( stripslashes( $raw_value ) ), true );

        $sanitized_qrs = array();
        if ( is_array( $decoded ) ) {
            foreach ( $decoded as $qr ) {
                $qr_name = sanitize_text_field( isset( $qr['qr_name'] ) ? $qr['qr_name'] : '' );
                $qr_code_url = esc_url_raw( isset( $qr['qr_code_url'] ) ? $qr['qr_code_url'] : '' );

                // Skip saving completely empty entries to allow default QR fallback
                if ( empty( $qr_name ) && empty( $qr_code_url ) ) {
                    continue;
                }

                $sanitized_qrs[] = array(
                    'qr_name'        => $qr_name,
                    'qr_code_url'    => $qr_code_url,
                    'payment_charge' => sanitize_text_field( isset( $qr['payment_charge'] ) ? $qr['payment_charge'] : '0' ),
                    'is_active'      => isset( $qr['is_active'] ) && $qr['is_active'] === 'yes' ? 'yes' : 'no',
                );
            }
        }
        return $sanitized_qrs;
    }

    /**
     * Enqueue CSS and JS assets on the checkout page.
     */
    public function enqueue_checkout_assets() {
        if ( ! is_checkout() || ! $this->is_available() ) {
            return;
        }

        $handle = 'smartqr-frontend';

        wp_enqueue_style( $handle, RIS_SMARTQR_URL . 'includes/css/smartqr-frontend.css', array(), RIS_SMARTQR_VERSION );
        wp_enqueue_script( $handle, RIS_SMARTQR_URL . 'includes/js/smartqr-frontend.js', array( 'jquery' ), RIS_SMARTQR_VERSION, true );

        // Find active QR code from settings
        $settings  = $this->settings;
        $qrs_table = isset( $settings['qrs_table'] ) ? $settings['qrs_table'] : array();
        
        if ( ! is_array( $qrs_table ) || empty( $qrs_table ) ) {
            $qrs_table = array(
                array(
                    'qr_name'        => 'Test QR',
                    'qr_code_url'    => RIS_SMARTQR_URL . 'assets/testqr.png',
                    'payment_charge' => '1',
                    'is_active'      => 'yes',
                )
            );
        }
        
        $active_qr = null;
        if ( is_array( $qrs_table ) && ! empty( $qrs_table ) ) {
            foreach ( $qrs_table as $qr ) {
                if ( isset( $qr['is_active'] ) && $qr['is_active'] === 'yes' ) {
                    $active_qr = $qr;
                    break;
                }
            }
            // Fallback: if none is active, use the first one
            if ( ! $active_qr && ! empty( $qrs_table ) ) {
                $active_qr = $qrs_table[0];
            }
        }

        $charge_percent = ( $active_qr && isset( $active_qr['payment_charge'] ) ) ? floatval( $active_qr['payment_charge'] ) : 0;
        
        // Calculate dynamic total including payment charge rounded to nearest integer (do not display decimal/fractional paisa values)
        $rounded_total = round( WC()->cart->get_total( 'edit' ) );
        $formatted_total = html_entity_decode( wp_strip_all_tags( wc_price( $rounded_total ) ) );

        // Localize configuration data
        wp_localize_script( $handle, 'ris_smartqr_params', array(
            'ajax_url'            => admin_url( 'admin-ajax.php' ),
            'upload_nonce'        => wp_create_nonce( 'ris_smartqr_upload_slip_action' ),
            'active_qr'           => $active_qr,
            'gateway_id'          => $this->id,
            'max_file_size'       => 5 * 1024 * 1024, // 5MB in bytes (per user instruction)
            'text_max_file_size'  => '5MB',
            'paymentpage_img_url' => RIS_SMARTQR_URL . 'assets/banglaqr-paymentpage.png',
            'order_total'         => $formatted_total,
            'payment_charge'      => $charge_percent,
            'error_no_file'       => __( 'Please upload your payment receipt or screenshot to confirm your order.', 'smartqr-payment-gateway-banglaqr' ),
            'error_invalid_file'  => __( 'Invalid file format. Only JPEG, PNG, WEBP, and GIF images are allowed.', 'smartqr-payment-gateway-banglaqr' ),
            'error_file_too_large'=> __( 'The selected file is too large. Maximum size allowed is 5MB.', 'smartqr-payment-gateway-banglaqr' ),
        ) );
    }

    /**
     * Get gateway icon logo.
     * Show the uploaded logo directly after the title on the checkout page.
     *
     * @return string
     */
    public function get_icon() {
        $logo_url = $this->icon;
        $icon = '';
        if ( $logo_url ) {
            $icon = '<img class="smartqr-checkout-gateway-logo" src="' . esc_url( $logo_url ) . '" alt="' . esc_attr( $this->get_title() ) . '" style="max-height: 30px; max-width: 100px; margin-left: 5px; vertical-align: middle; display: inline-block;" />';
        }
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        return apply_filters( 'woocommerce_gateway_icon', $icon, $this->id );
    }

    /**
     * Render the payment fields on Checkout.
     */
    public function payment_fields() {
        // Output description if set
        if ( $this->description ) {
            echo wp_kses_post( wpautop( $this->description ) );
        }

        // Output hidden checkout inputs which will hold the slip metadata
        ?>
        <div id="smartqr-checkout-fields-container">
            <input type="hidden" name="ris_smartqr_receipt_id" id="ris_smartqr_receipt_id" value="" />
            <input type="hidden" name="ris_smartqr_selected_qr" id="ris_smartqr_selected_qr" value="" />
            <div id="smartqr-selected-qr-preview" class="smartqr-selected-qr-preview" style="display:none; padding: 12px; border: 1px dashed #137833; border-radius: 8px; background-color: #f0fdf4; margin-top: 10px; font-size: 13px;"></div>
        </div>
        <?php
    }

    /**
     * Server-side validation of checkout fields when order is submitted.
     */
    public function validate_checkout_fields() {
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ( isset( $_POST['payment_method'] ) && sanitize_text_field( wp_unslash( $_POST['payment_method'] ) ) === $this->id ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            if ( empty( $_POST['ris_smartqr_receipt_id'] ) ) {
                wc_add_notice( __( 'Please upload your payment receipt or screenshot to complete the order via Bangla QR Payment.', 'smartqr-payment-gateway-banglaqr' ), 'error' );
            }
        }
    }

    /**
     * Process WooCommerce Payment.
     *
     * @param int $order_id Order ID.
     * @return array
     */
    public function process_payment( $order_id ) {
        $order = wc_get_order( $order_id );

        // Save receipt and selected QR metadata to the order
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ( ! empty( $_POST['ris_smartqr_receipt_id'] ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            $receipt_id = absint( wp_unslash( $_POST['ris_smartqr_receipt_id'] ) );
            $order->update_meta_data( '_ris_smartqr_receipt_id', $receipt_id );
            
            // Set the attachment as media parent of this order
            wp_update_post( array(
                'ID'          => $receipt_id,
                'post_parent' => $order_id,
            ) );
        }

        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        if ( ! empty( $_POST['ris_smartqr_selected_qr'] ) ) {
            // phpcs:ignore WordPress.Security.NonceVerification.Missing
            $selected_qr = sanitize_text_field( wp_unslash( $_POST['ris_smartqr_selected_qr'] ) );
            $order->update_meta_data( '_ris_smartqr_selected_qr', $selected_qr );
        }

        // Set order status to on-hold (awaiting verification)
        $order->update_status( 'on-hold', __( 'Awaiting Bangla QR payment receipt verification.', 'smartqr-payment-gateway-banglaqr' ) );

        // Reduce stock levels
        wc_reduce_stock_levels( $order_id );

        // Clear cart
        WC()->cart->empty_cart();

        // Return thank you redirect
        return array(
            'result'   => 'success',
            'redirect' => $this->get_return_url( $order ),
        );
    }

}
