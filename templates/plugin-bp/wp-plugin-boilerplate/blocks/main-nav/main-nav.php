<?php
/**
 * Main nav Block Template.
 *
 * @param   array $block The block settings and attributes.
 * @param   string $content The block inner HTML (empty).
 * @param   bool $is_preview True during backend preview render.
 * @param   int $post_id The post ID the block is rendering content against.
 *          This is either the post ID currently being displayed inside a query loop,
 *          or the post ID of the post hosting this block.
 * @param   array $context The context provided to the block by the post or it's parent block.
 */

// Support custom "anchor" values.
$anchor = '';
if ( ! empty( $block['anchor'] ) ) {
    $anchor = 'id="' . esc_attr( $block['anchor'] ) . '" ';
}

// Load values and assign defaults.
$class_name = 'orphic-plugin-boilerplate-main-nav';

$wrapper_attributes = get_block_wrapper_attributes(
    [
    'class' => $class_name
    ]
);
$logo = get_field('logo','option');
?>
<div <?php echo $anchor ?><?php echo $wrapper_attributes; ?>>
    <div class="orphic-plugin-boilerplate-main-nav-container">
        <a href="<?php echo get_home_url(); ?>" class="orphic-plugin-boilerplate-main-nav-logo">
            <?php if($logo): ?>
                <img src="<?php echo $logo['url'] ?>" alt="<?php echo $logo['alt'] ?>" />
            <?php endif; ?>
        </a>
        <div class="orphic-plugin-boilerplate-main-nav-items-wrap desktop">
            <div class="orphic-plugin-boilerplate-main-nav-items">
                <?php
                    if( have_rows('items_navigation','option') ):
                        while( have_rows('items_navigation','option') ) : the_row();
                            $link = get_sub_field('link');
                        ?>
                        <?php if($link): ?>
                            <a href="<?php echo $link['url'] ?>" class="main-nav-primary-link"><?php echo $link['title'] ?></a>
                        <?php endif; ?>
                        <?php
                        endwhile;
                    endif;
                ?>
            </div>
        </div>
        <div class="orphic-plugin-boilerplate-main-nav-items-wrap mobile">
            <div class="orphic-plugin-boilerplate-main-nav-top-bar">
            </div>
            <div class="orphic-plugin-boilerplate-main-nav-items">
                <div class="orphic-plugin-boilerplate-mobile-nav-toggle">
                    <div class="line-1"></div>
                    <div class="line-2"></div>
                    <div class="line-3"></div>
                </div>
            </div>
        </div>
    </div>
    <div class="orphic-plugin-boilerplate-main-nav-mobile" style="display:none;">
        <?php
        if( have_rows('items_navigation','option') ):
            while( have_rows('items_navigation','option') ) : the_row();
                $link = get_sub_field('link');
            ?>
            <?php if($link): ?>
                <a href="<?php echo $link['url'] ?>" class="main-nav-mobile-link"><?php echo $link['title'] ?></a>
            <?php endif; ?>
            <?php
            endwhile;
        endif;
        ?>
    </div>
</div>