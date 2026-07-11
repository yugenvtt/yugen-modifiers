/**
 * @file src/hooks/hover-token.ts
 * registers the hoverToken hook to track token hovering on the canvas.
 **/

import { TokenHoverManager } from '../module/token-hover-manager.js';

export const hover_token_hook = ( ) => 
{
	/** register token hover canvas hook **/
	Hooks.on( 'hoverToken', ( token: any, hovered: boolean ) => 
	{
		TokenHoverManager.handle_hover( token, hovered );
	} );

	/** register canvas panning hook **/
	Hooks.on( 'canvasPan', ( ) => 
	{
		TokenHoverManager.destroy( );
	} );

	/** register canvas teardown hook **/
	Hooks.on( 'canvasTearDown', ( ) => 
	{
		TokenHoverManager.destroy( );
	} );

	/** register token update hook **/
	Hooks.on( 'updateToken', ( ) => 
	{
		TokenHoverManager.destroy( );
	} );

	/** register token deletion hook **/
	Hooks.on( 'deleteToken', ( ) => 
	{
		TokenHoverManager.destroy( );
	} );

	/** register click listener to dismiss hover tooltip **/
	document.addEventListener( 'click', ( ) => 
	{
		TokenHoverManager.destroy( );
	} );
};
