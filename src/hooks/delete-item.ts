/**
 * @file src/hooks/delete-item.ts
 * handles the deleteItem hook to clean up configurations when items are removed.
 **/

import { reevaluate_token_image } from '../module/token-service.js';

export const delete_item_hook = ( ) => 
{
	/** listen for item document deletions from actors **/
	Hooks.on( 'deleteItem', async ( item: any, _options: any, user_id: string ) => 
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

		const actor = item.parent;
		if ( !actor ) 
		{
			return;
		}

		const configs = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'configurations' ) || [ ];
		const is_configured = configs.some( ( c: any ) => 
		{
			return c.itemId === item.id;
		} );

		if ( !is_configured ) 
		{
			return;
		}

		/** remove configuration entry for the deleted item **/
		const updated_configs = configs.filter( ( c: any ) => 
		{
			return c.itemId !== item.id;
		} );

		await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'configurations', updated_configs, { yugen_modifier_update: true } );

		/** check if it was the last equipped item **/
		const last_equipped_id = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'last_equipped_id' );
		if ( last_equipped_id === item.id ) 
		{
			await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'last_equipped_id', '', { yugen_modifier_update: true } );
		}

		/** reevaluate and update token image **/
		await reevaluate_token_image( actor );
	} );
};
