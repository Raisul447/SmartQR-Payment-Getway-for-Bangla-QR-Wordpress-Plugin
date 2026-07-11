<?php
/**
 * AJAX Handler for payment slip uploads for RIS_SmartQR
 */

defined( 'ABSPATH' ) || exit;

class RIS_SmartQR_Ajax {

    /**
     * Constructor
     */
    public function __construct() {
        add_action( 'wp_ajax_ris_smartqr_upload_slip', array( $this, 'handle_slip_upload' ) );
        add_action( 'wp_ajax_nopriv_ris_smartqr_upload_slip', array( $this, 'handle_slip_upload' ) );
    }

    /**
     * Handle receipt image upload.
     */
    public function handle_slip_upload() {
        // Temporarily increase memory limit and execution time for heavy image processing
        // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged
        @ini_set( 'memory_limit', '1024M' );
        // phpcs:ignore Squiz.PHP.DiscouragedFunctions.Discouraged
        @set_time_limit( 120 );

        // Verify nonce
        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
        $nonce = isset( $_POST['nonce'] ) ? sanitize_key( wp_unslash( $_POST['nonce'] ) ) : '';
        if ( ! wp_verify_nonce( $nonce, 'ris_smartqr_upload_slip_action' ) ) {
            wp_send_json_error( array( 'message' => __( 'Security verification failed. Please refresh the page and try again.', 'smartqr-payment-gateway-banglaqr' ) ) );
        }

        // Check if file is uploaded
        if ( ! isset( $_FILES['ris_smartqr_file'] ) ) {
            wp_send_json_error( array( 'message' => __( 'No file was uploaded.', 'smartqr-payment-gateway-banglaqr' ) ) );
        }

        // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized
        $file = $_FILES['ris_smartqr_file'];

        // Check for upload errors
        if ( $file['error'] !== UPLOAD_ERR_OK ) {
            wp_send_json_error( array( 'message' => __( 'File upload failed with error code: ', 'smartqr-payment-gateway-banglaqr' ) . $file['error'] ) );
        }

        // Validate size (max 5MB per user instructions)
        $max_size = 5 * 1024 * 1024; // 5MB
        if ( $file['size'] > $max_size ) {
            wp_send_json_error( array( 'message' => __( 'File size exceeds the 5MB limit.', 'smartqr-payment-gateway-banglaqr' ) ) );
        }

        // Validate file type (image types only)
        $allowed_mimes = array(
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'image/gif',
        );

        // Double check MIME type
        if ( function_exists( 'finfo_open' ) ) {
            $finfo     = finfo_open( FILEINFO_MIME_TYPE );
            $mime_type = finfo_file( $finfo, $file['tmp_name'] );
            finfo_close( $finfo );
        } else {
            $mime_type = $file['type'];
        }

        if ( ! in_array( $mime_type, $allowed_mimes ) ) {
            wp_send_json_error( array( 'message' => __( 'Invalid file type. Only JPG, JPEG, PNG, WEBP, and GIF images are allowed.', 'smartqr-payment-gateway-banglaqr' ) ) );
        }

        // Include WordPress file handler if not loaded
        if ( ! function_exists( 'wp_handle_upload' ) ) {
            require_once ABSPATH . 'wp-admin/includes/file.php';
        }

        // Handle upload directly on the filesystem
        $upload_overrides = array( 'test_form' => false );
        $file_info = wp_handle_upload( $_FILES['ris_smartqr_file'], $upload_overrides );

        if ( isset( $file_info['error'] ) ) {
            wp_send_json_error( array( 'message' => $file_info['error'] ) );
        }

        $file_path = $file_info['file'];
        $file_url  = $file_info['url'];
        $file_type = $file_info['type'];

        // Compress, rotate and resize the uploaded receipt image directly on the filesystem first
        if ( $file_path && file_exists( $file_path ) ) {
            $editor = wp_get_image_editor( $file_path );
            if ( ! is_wp_error( $editor ) ) {
                // 1. Fix orientation based on EXIF metadata (crucial for mobile photo uploads)
                if ( function_exists( 'exif_read_data' ) ) {
                    $exif = @exif_read_data( $file_path );
                    if ( ! empty( $exif['Orientation'] ) ) {
                        switch ( $exif['Orientation'] ) {
                            case 3:
                                $editor->rotate( 180 );
                                break;
                            case 6:
                                $editor->rotate( 270 );
                                break;
                            case 8:
                                $editor->rotate( 90 );
                                break;
                        }
                    }
                }

                // 2. Resize if image is larger than 1200px in either dimension to optimize dimensions
                $sizes = $editor->get_size();
                if ( isset( $sizes['width'] ) && isset( $sizes['height'] ) ) {
                    $max_dimension = 1200;
                    if ( $sizes['width'] > $max_dimension || $sizes['height'] > $max_dimension ) {
                        $editor->resize( $max_dimension, $max_dimension, false );
                    }
                }
                
                // 3. Compress quality to 70% (user requested compression - saves up to 80% storage space)
                $editor->set_quality( 70 );
                $editor->save( $file_path );
                
                // Clear PHP's file status cache to get accurate size
                clearstatcache( true, $file_path );
            }
        }

        // Set custom title for the attachment
        $file_title = sprintf( 'SmartQR_Receipt_%s_%s', gmdate( 'Ymd_His' ), uniqid() );
        
        // Register attachment in Media Library using the already compressed filesystem file
        $attachment = array(
            'guid'           => $file_url,
            'post_mime_type' => $file_type,
            'post_title'     => $file_title,
            'post_content'   => '',
            'post_status'    => 'inherit',
        );

        $attachment_id = wp_insert_attachment( $attachment, $file_path, 0 );

        if ( is_wp_error( $attachment_id ) ) {
            wp_send_json_error( array( 'message' => $attachment_id->get_error_message() ) );
        }

        // Get final image dimensions for metadata
        $width = 0;
        $height = 0;
        if ( file_exists( $file_path ) ) {
            $image_info = @getimagesize( $file_path );
            if ( is_array( $image_info ) ) {
                $width  = $image_info[0];
                $height = $image_info[1];
            }
        }

        // Get relative file path
        $uploads_dir = wp_get_upload_dir();
        $relative_file = str_replace( trailingslashit( $uploads_dir['basedir'] ), '', $file_path );

        // Construct lightweight attachment metadata to bypass slow thumbnail generation
        $metadata = array(
            'width'      => $width,
            'height'     => $height,
            'file'       => $relative_file,
            'sizes'      => array(), // Skip thumbnail creation
            'image_meta' => array(
                'aperture'          => '0',
                'credit'            => '',
                'camera'            => '',
                'caption'           => '',
                'created_timestamp' => '0',
                'copyright'         => '',
                'focal_length'      => '0',
                'iso'               => '0',
                'shutter_speed'     => '0',
                'title'             => '',
                'orientation'       => '0',
                'keywords'          => array(),
            ),
            'filesize'   => filesize( $file_path ),
        );
        
        wp_update_attachment_metadata( $attachment_id, $metadata );

        // Send success response
        wp_send_json_success( array(
            'attachment_id' => $attachment_id,
            'url'           => wp_get_attachment_url( $attachment_id ),
            'message'       => __( 'File uploaded and compressed successfully!', 'smartqr-payment-gateway-banglaqr' ),
        ) );
    }
}
