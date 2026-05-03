<?php

/**
 * Define the internationalization functionality
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @link       https://orphic.ca
 * @since      1.0.0
 *
 * @package    Orphic_Plugin_Boilerplate
 * @subpackage Orphic_Plugin_Boilerplate/includes
 */

/**
 * Define the internationalization functionality.
 *
 * Loads and defines the internationalization files for this plugin
 * so that it is ready for translation.
 *
 * @since      1.0.0
 * @package    Orphic_Plugin_Boilerplate
 * @subpackage Orphic_Plugin_Boilerplate/includes
 * @author     Orphic <contact@orphic.ca>
 */
class Orphic_Plugin_Boilerplate_i18n {


	/**
	 * Load the plugin text domain for translation.
	 *
	 * @since    1.0.0
	 */
	public function load_plugin_textdomain() {

		load_plugin_textdomain(
			'orphic-plugin-boilerplate',
			false,
			dirname( dirname( plugin_basename( __FILE__ ) ) ) . '/languages/'
		);

	}



}
