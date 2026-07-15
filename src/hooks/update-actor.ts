/**
 * @file src/hooks/update-actor.ts
 * handles the updateActor hook to trigger token re-evaluation when configurations change.
 **/

import { reevaluate_token_image } from '../module/token-service.js';

export const update_actor_hook = ( ) => 
{
	/** listen for actor document updates **/
	Hooks.on( 'updateActor', async ( actor: any, change: any, _options: any, user_id: string ) => 
	{
		/**
		 * check if token configurations are enabled
		 **/
		if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
		{
			return;
		}

		/** only process on the primary gm client to avoid duplicate updates **/
		if ( !( globalThis as any ).yugen_utils.is_primary_gm( ) ) 
		{
			return;
		}

		/** ignore updates triggered by our own module to prevent loops **/
		if ( _options.yugen_modifier_update ) 
		{
			return;
		}

		/** check if prototype token image was updated natively **/
		const new_proto_img = change.prototypeToken?.texture?.src;
		if ( new_proto_img ) 
		{
			/** update stored default image flag to match new native setting **/
			await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'default_image', new_proto_img, { yugen_modifier_update: true } );
			await reevaluate_token_image( actor );
			return;
		}

		/** check if flag configuration was changed **/
		const has_flag_change = change.flags && change.flags[ 'yugen-modifiers' ] !== undefined;

		if ( has_flag_change ) 
		{
			await reevaluate_token_image( actor );
		}
	} );
};
