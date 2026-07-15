/**
 * @file src/hooks/get-scene-control-buttons.ts
 * registers the yugen-modifiers tool button on the tokens scene control layer.
 **/

import { EquipConfig } from '../module/equip-config.js';

export const get_scene_control_buttons_hook = ( ) => 
{
	/** listen for scene controls construction to inject token equipment config tool **/
	Hooks.on( 'getSceneControlButtons', ( controls: any ) => 
	{
		/**
		 * check if token configurations are enabled
		 **/
		if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
		{
			return;
		}

		const tool = 
		{
			name: 'yugen-modifiers-equip-config',
			title: ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.button-tooltip' ),
			icon: 'fa-solid fa-shirt',
			onClick: ( ) => 
			{
				const controlled = ( canvas as any ).tokens?.controlled || [ ];
				if ( controlled.length !== 1 ) 
				{
					( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-actor-selected' ) );
					return;
				}

				const actor = controlled[ 0 ].actor;
				if ( !actor ) 
				{
					( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-actor-selected' ) );
					return;
				}

				if ( !actor.testUserPermission( ( game as any ).user, 'OWNER' ) ) 
				{
					( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-ownership' ) );
					return;
				}

				new EquipConfig( actor ).render( { force: true } );
			},
			button: true
		};

		/** register scene control tool via yugen-utils global helper **/
		( globalThis as any ).yugen_utils.register_control_tool( controls, 'tokens', tool );
	} );
};
