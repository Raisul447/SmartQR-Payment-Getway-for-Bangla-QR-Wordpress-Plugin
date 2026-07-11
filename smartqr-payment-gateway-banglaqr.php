<?php
/**
 * Plugin Name: SmartQR Payment Gateway for BanglaQR
 * Plugin URI: https://raisul.dev/projects/smartqr-payment-getway-for-banglaqr-wordpress-plugin
 * Description: A WooCommerce payment gateway supporting bank and mobile QR payments with a scan-to-pay popup and payment receipt upload verification.
 * Version: 1.2.1
 * Author: Raisul Islam Shagor
 * Author URI: https://raisul.dev
 * License: GPLv2 or later
 * Domain Path: /languages
 * Tested up to: 7.0
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: smartqr-payment-gateway-banglaqr
 */

defined( 'ABSPATH' ) || exit;

// Define plugin-wide constants
define( 'RIS_SMARTQR_VERSION', '1.2.1' );
define( 'RIS_SMARTQR_PATH', plugin_dir_path( __FILE__ ) );
define( 'RIS_SMARTQR_URL', plugin_dir_url( __FILE__ ) );
define( 'RIS_SMARTQR_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Add settings action link to the plugin lists table.
 *
 * @param array $links Array of plugin action links.
 * @return array Modified links array.
 */
function ris_smartqr_add_settings_link( $links ) {
    $settings_url = admin_url( 'admin.php?page=wc-settings&tab=checkout&section=ris_smartqr' );
    $settings_link = '<a href="' . esc_url( $settings_url ) . '">' . esc_html__( 'Settings', 'smartqr-payment-gateway-banglaqr' ) . '</a>';
    array_unshift( $links, $settings_link );
    return $links;
}
add_filter( 'plugin_action_links_' . RIS_SMARTQR_BASENAME, 'ris_smartqr_add_settings_link' );

/**
 * Initialize the plugin when plugins are loaded.
 */
function ris_smartqr_init_plugin() {
    // Check if WooCommerce is active
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', 'ris_smartqr_woocommerce_missing_notice' );
        return;
    }

    // Include files
    require_once RIS_SMARTQR_PATH . 'includes/class-ris-smartqr-gateway.php';
    require_once RIS_SMARTQR_PATH . 'includes/class-ris-smartqr-admin.php';
    require_once RIS_SMARTQR_PATH . 'includes/class-ris-smartqr-ajax.php';

    // Initialize ajax hooks & admin additions
    new RIS_SmartQR_Ajax();
    new RIS_SmartQR_Admin();

    // Register gateway in WooCommerce
    add_filter( 'woocommerce_payment_gateways', 'ris_smartqr_register_gateway' );

    // Calculate fees globally to bypass class instantiation delays
    add_action( 'woocommerce_cart_calculate_fees', 'ris_smartqr_add_payment_charge_fee' );
}
add_action( 'plugins_loaded', 'ris_smartqr_init_plugin', 11 );

/**
 * WooCommerce Missing Admin Notice.
 */
function ris_smartqr_woocommerce_missing_notice() {
    ?>
    <div class="error notice">
        <p><?php esc_html_e( 'SmartQR Payment Gateway for BanglaQR requires WooCommerce to be active. Please install and activate WooCommerce first.', 'smartqr-payment-gateway-banglaqr' ); ?></p>
    </div>
    <?php
}

/**
 * Register Gateway with WooCommerce.
 *
 * @param array $gateways WooCommerce gateways.
 * @return array
 */
function ris_smartqr_register_gateway( $gateways ) {
    $gateways[] = 'RIS_SmartQR_Gateway';
    return $gateways;
}

/**
 * Add payment gateway charge fee globally.
 */
function ris_smartqr_add_payment_charge_fee() {
    if ( is_admin() && ! defined( 'DOING_AJAX' ) ) {
        return;
    }

    // 1. Get chosen payment method from POST or Session
    $chosen_gateway = '';
    // phpcs:ignore WordPress.Security.NonceVerification.Missing
    if ( isset( $_POST['payment_method'] ) ) {
        // phpcs:ignore WordPress.Security.NonceVerification.Missing
        $chosen_gateway = sanitize_text_field( wp_unslash( $_POST['payment_method'] ) );
    // phpcs:ignore WordPress.Security.NonceVerification.Missing
    } elseif ( isset( $_POST['post_data'] ) ) {
        $post_data = array();
        // phpcs:ignore WordPress.Security.NonceVerification.Missing, WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        wp_parse_str( wp_unslash( $_POST['post_data'] ), $post_data );
        if ( isset( $post_data['payment_method'] ) ) {
            $chosen_gateway = sanitize_text_field( $post_data['payment_method'] );
        }
    } elseif ( WC()->session ) {
        $chosen_gateway = WC()->session->get( 'chosen_payment_method' );
    }

    if ( 'ris_smartqr' !== $chosen_gateway ) {
        return;
    }

    // 2. Fetch the active QR code settings directly from database
    $settings = get_option( 'woocommerce_ris_smartqr_settings', array() );
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
        if ( ! $active_qr && ! empty( $qrs_table ) ) {
            $active_qr = $qrs_table[0];
        }
    }

    $charge_percent = ( $active_qr && isset( $active_qr['payment_charge'] ) ) ? floatval( $active_qr['payment_charge'] ) : 0;
    if ( $charge_percent <= 0 ) {
        return;
    }

    // 3. Base amount: subtotal + shipping
    $base_amount = WC()->cart->get_subtotal() + WC()->cart->get_shipping_total();
    
    // Calculate fee
    $fee = ( $base_amount * $charge_percent ) / 100;
    $fee = round( $fee );
    
    if ( $fee > 0 ) {
        // translators: %s is the payment charge percentage.
        $fee_name = sprintf( __( 'Payment Charge (%s%%)', 'smartqr-payment-gateway-banglaqr' ), $charge_percent );
        WC()->cart->add_fee( $fee_name, $fee, true );
    }
}
