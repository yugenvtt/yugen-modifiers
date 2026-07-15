/**
 * @file src/hooks/update-item.ts
 * handles the updateItem hook to trigger token image swaps when equipment state changes.
 **/

import { is_item_equipped } from '../module/utils.js';
import { reevaluate_token_image } from '../module/token-service.js';

export const update_item_hook = ( ) => 
{
	/** listen for item document updates on actor inventory **/
	Hooks.on( 'updateItem', async ( item: any, change: any, _options: any, user_id: string ) => 
	{
		/**
		 * check if token configurations are enabled
		 **/
		if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
		{
			return;
		}

		/** only process on the primary gm client to avoid race conditions or permission limits **/
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

		/** check if equipment status changed in the update payload **/
		let changed = false;
		if ( change.system ) 
		{
			if ( 'equipped' in change.system ) 
			{
				changed = true;
			}
			else if ( change.system.equipped && typeof change.system.equipped === 'object' ) 
			{
				if ( 'carryType' in change.system.equipped || 'value' in change.system.equipped ) 
				{
					changed = true;
				}
			}
		}

		if ( changed ) 
		{
			const equipped = is_item_equipped( item );
			if ( equipped ) 
			{
				/** set this item as the latest equipped item **/
				await ( globalThis as any ).yugen_utils.set_flag( actor, 'yugen-modifiers', 'last_equipped_id', item.id, { yugen_modifier_update: true } );
			}

			/** reevaluate and update token image **/
			await reevaluate_token_image( actor );
		}
	} );
};
