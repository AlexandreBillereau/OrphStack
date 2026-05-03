<?php

/**
 * The public-facing functionality of the plugin.
 *
 * @link       https://orphic.ca
 * @since      1.0.0
 *
 * @package    Orphic_Plugin_Boilerplate
 * @subpackage Orphic_Plugin_Boilerplate/public
 */

/**
 * The public-facing functionality of the plugin.
 *
 * Defines the plugin name, version, and two examples hooks for how to
 * enqueue the public-facing stylesheet and JavaScript.
 *
 * @package    Orphic_Plugin_Boilerplate
 * @subpackage Orphic_Plugin_Boilerplate/public
 * @author     Orphic <contact@orphic.ca>
 */
class Orphic_Plugin_Boilerplate_Public {

  /**
   * The ID of this plugin.
   *
   * @since    1.0.0
   * @access   private
   * @var      string    $plugin_name    The ID of this plugin.
   */
  private $plugin_name;

  /**
   * The version of this plugin.
   *
   * @since    1.0.0
   * @access   private
   * @var      string    $version    The current version of this plugin.
   */
  private $version;

  /**
   * Initialize the class and set its properties.
   *
   * @since    1.0.0
   * @param      string    $plugin_name       The name of the plugin.
   * @param      string    $version    The version of this plugin.
   */
  public function __construct($plugin_name, $version) {

    $this->plugin_name = $plugin_name;
    $this->version = $version;
  }

  /**
   * Register the stylesheets for the public-facing side of the site.
   *
   * @since    1.0.0
   */
  public function enqueue_styles() {

    /**
     * This function is provided for demonstration purposes only.
     *
     * An instance of this class should be passed to the run() function
     * defined in Orphic_Plugin_Boilerplate_Loader as all of the hooks are defined
     * in that particular class.
     *
     * The Orphic_Plugin_Boilerplate_Loader will then create the relationship
     * between the defined hooks and the functions defined in this
     * class.
     */

    wp_enqueue_style($this->plugin_name, plugin_dir_url(__FILE__) . 'css/orphic-plugin-boilerplate-public.css', array(), $this->version, 'all');
  }

  /**
   * Register the JavaScript for the public-facing side of the site.
   *
   * @since    1.0.0
   */
  public function enqueue_scripts() {

    /**
     * This function is provided for demonstration purposes only.
     *
     * An instance of this class should be passed to the run() function
     * defined in Orphic_Plugin_Boilerplate_Loader as all of the hooks are defined
     * in that particular class.
     *
     * The Orphic_Plugin_Boilerplate_Loader will then create the relationship
     * between the defined hooks and the functions defined in this
     * class.
     */

    wp_enqueue_script($this->plugin_name, plugin_dir_url(__FILE__) . 'js/orphic-plugin-boilerplate-public.js', array('jquery'), $this->version, false);

    wp_register_script("orphic-plugin-boilerplate-main-nav-block-script", ORPHIC_PLUGIN_BOILERPLATE_PLUGIN_DIR_PATH . 'blocks/main-nav/main-nav.js', array('jquery'), $this->version, false);
  }

  public function register_acf_blocks() {
    if (!function_exists('register_block_type')) {
      return;
    }

    $base_dir = ORPHIC_PLUGIN_BOILERPLATE_PLUGIN_DIR_PATH . '/blocks';

    $iterator = new RecursiveIteratorIterator(
      new RecursiveDirectoryIterator($base_dir, RecursiveDirectoryIterator::SKIP_DOTS),
      RecursiveIteratorIterator::SELF_FIRST
    );

    foreach ($iterator as $fileinfo) {
      if ($fileinfo->isDir()) {
        $block_dir = $fileinfo->getPathname();
        register_block_type($block_dir);
      }
    }
  }
}
