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
		/** retrieve token configurations enabled status setting **/
		if ( !( game as any ).settings.get( 'yugen-modifiers', 'enable-token-configurations' ) ) 
		{
			return;
		}

		const open_config = ( ) => 
		{
			const controlled = ( canvas as any ).tokens?.controlled || [ ];
			if ( controlled.length !== 1 ) 
			{
				/** localize and show no actor selected warning **/
				( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-actor-selected' ) );
				return;
			}

			const actor = controlled[ 0 ].actor;
			if ( !actor ) 
			{
				/** localize and show no actor selected warning **/
				( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-actor-selected' ) );
				return;
			}

			/** test document permission ownership of actor **/
			if ( !actor.testUserPermission( ( game as any ).user, 'OWNER' ) ) 
			{
				/** localize and show ownership warning **/
				( ui as any ).notifications?.warn( ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.warnings.no-ownership' ) );
				return;
			}

			new EquipConfig( actor ).render( { force: true } );
		};

		/** localize scene control button tooltip **/
		const tooltip_title = ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.button-tooltip' );

		const tool: any = 
		{
			name: 'yugen-modifiers-equip-config',
			title: tooltip_title,
			icon: 'fa-solid fa-shirt',
			button: true
		};

		/**
		 * determine if we should register the click handler using onchange rather than onclick
		 * to prevent deprecation warnings in foundry v13 and newer.
		 **/
		if ( ( game as any ).version && !foundry.utils.isNewerVersion( '13.0.0', ( game as any ).version ) ) 
		{
			tool.onChange = open_config;
		}
		else 
		{
			tool.onClick = open_config;
		}

		/** register scene control tool via yugen-utils global helper **/
		( globalThis as any ).yugen_utils.register_control_tool( controls, 'tokens', tool );
	} );
};
