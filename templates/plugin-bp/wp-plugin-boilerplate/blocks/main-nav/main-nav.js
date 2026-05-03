(function( $ ) {
	'use strict';
    
    $(document).ready(function() {
        const nav = $('.orphic-plugin-boilerplate-main-nav');
        nav.find('.orphic-plugin-boilerplate-mobile-nav-toggle').first().on('click', function(){
            const mobileMenu = nav.find('.orphic-plugin-boilerplate-main-nav-mobile').first();

            if($(this).hasClass('open')){
                $(this).removeClass('open');
                mobileMenu.slideUp(200);
            }else{
                $(this).addClass('open');
                mobileMenu.slideDown(200);
            }
        });
    });

})( jQuery );