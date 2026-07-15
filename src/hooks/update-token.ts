/**
 * @file src/hooks/update-token.ts
 * handles the updateToken hook to update the actor's default image when changed natively.
 **/

import { reevaluate_token_image } from '../module/token-service.js';

/**
 * listen for token document updates to catch manual token texture changes
 * and update our stored default_image flag. this prevents manual image overrides
 * on canvas tokens from being reverted when equipment configurations change.
 **/
export const update_token_hook = ( ) => 
{
	/** register token document update listener **/
	Hooks.on( 'updateToken', async ( token_doc: any, change: any, options: any, _user_id: string ) => 
	{
		/** retrieve token configurations enabled status setting **/
		if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
		{
			return;
		}

		/** verify client is the primary gm to avoid duplicate updates **/
		if ( !( globalThis as any ).yugen_utils.is_primary_gm( ) ) 
		{
			return;
		}

		/** ignore updates triggered by our own module to prevent loops **/
		if ( options.yugen_modifier_update ) 
		{
			return;
		}

		/** check if token texture src was updated natively **/
		const new_img = change.texture?.src;
		if ( new_img ) 
		{
			const actor = token_doc.actor;
			if ( actor ) 
			{
				/** set namespaced default image flag on actor **/
				await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'default_image', new_img, { yugen_modifier_update: true } );
				
				/** re-evaluate token textures for actor **/
				await reevaluate_token_image( actor );
			}
		}
	} );
};
