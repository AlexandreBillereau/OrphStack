<?php
/**
 * Footer Block Template.
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
$class_name = 'orphic-plugin-boilerplate-footer';

$wrapper_attributes = get_block_wrapper_attributes(
    [
    'class' => $class_name
    ]
);
$logo = get_field('logo_footer','option');
?>
<div <?php echo $anchor ?><?php echo $wrapper_attributes; ?>>
    <div class="orphic-plugin-boilerplate-top-footer">
        <a href="<?php echo get_home_url(); ?>" class="orphic-plugin-boilerplate-footer-logo">
            <?php if($logo): ?>
                <img src="<?php echo $logo['url'] ?>" alt="<?php echo $logo['alt'] ?>" />
            <?php endif; ?>
        </a>
    </div>
    <div class="orphic-plugin-boilerplate-footer-container">
        <div class="orphic-plugin-boilerplate-footer-menus">
            <?php
                if( have_rows('menus','option') ):
                    while( have_rows('menus','option') ) : the_row();
                        $title = get_sub_field('titre_du_menu');
                    ?>
                        <div class="orphic-plugin-boilerplate-footer-menu-col">
                            <a href="<?php echo $title['url'] ?>" class="orphic-plugin-boilerplate-footer-menu-title"><?php echo $title['title'] ?></a>
                        <?php
                            if( have_rows('items','option') ):
                                while( have_rows('items','option') ) : the_row();
                                    $link = get_sub_field('lien');
                                ?>
                                <?php if($link): ?>
                                    <a href="<?php echo $link['url'] ?>" class="orphic-plugin-boilerplate-footer-menu-link"><?php echo $link['title'] ?></a>
                                <?php endif; ?>
                                <?php
                                endwhile;
                            endif;
                        ?>
                        </div>
                    <?php
                    endwhile;
                endif;
            ?>
        </div>
    </div>
    <div class="orphic-plugin-boilerplate-subfooter">
        <div class="orphic-plugin-boilerplate-footer-politiques">
            <?php
                if( have_rows('politiques','option') ):
                    while( have_rows('politiques','option') ) : the_row();
                        $link = get_sub_field('lien');
                    ?>
                    <?php if($link): ?>
                        <a href="<?php echo $link['url'] ?>" target="<?php echo $link['target'] ?>" class="orphic-plugin-boilerplate-politiques-menu-link"><?php echo $link['title'] ?></a>
                    <?php endif; ?>
                    <?php
                    endwhile;
                endif;
            ?>
        </div>
        <div class="orphic-plugin-boilerplate-footer-socials">
            <?php
                if( have_rows('medias_sociaux','option') ):
                    while( have_rows('medias_sociaux','option') ) : the_row();
                        $link = get_sub_field('lien');
                        $icone = get_sub_field('icone');
                    ?>
                    <?php if($link && $icone): ?>
                        <a href="<?php echo $link['url'] ?>" target="_blank" class="orphic-plugin-boilerplate-social-link"><?php echo $icone ?></a>
                    <?php endif; ?>
                    <?php
                    endwhile;
                endif;
            ?>
        </div>
    </div>
</div>
<div style="display:none;">orphic-monitoring-keyword</div>