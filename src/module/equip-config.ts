/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/naming-convention */
/**
 * @file src/module/equip-config.ts
 * provides the configuration user interface for managing item-based token swaps.
 **/

import { is_item_equipped, is_equippable_item } from './utils.js';
import { reevaluate_token_image } from './token-service.js';

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class EquipConfig extends HandlebarsApplicationMixin( ApplicationV2 ) 
{
	private _actor: any;
	private _configured_items: any[] = [ ];


	constructor( actor: any, options: any = { } ) 
	{
		super( options );
		this._actor = actor;

		/** retrieve existing configurations flag namespaced to module **/
		const stored = ( globalThis as any ).yugen_utils.get_flag( actor, 'yugen-modifiers', 'configurations' ) || [ ];
		this._configured_items = stored;
	}

	/**
	 * returns the localized window title.
	 **/
	override get title( ): string 
	{
		return ( game as any ).i18n.localize( 'yugen-modifiers.equip-tokens.title' );
	}

	static override DEFAULT_OPTIONS = 
	{
		id: 'yugen-modifiers-equip-config',
		tag: 'form',
		classes: [ 
			'yugen-app', 
			'app' 
		],
		window: 
		{
			title: 'yugen-modifiers.equip-tokens.title',
			resizable: true
		},
		position: 
		{
			width: 650,
			height: 700
		}
	};

	static override PARTS = 
	{
		config: 
		{
			template: 'modules/yugen-modifiers/templates/equip-config.hbs'
		}
	};

	/**
	 * prepares data context for rendering the handlebars template.
	 **/
	override async _prepareContext( _options: any ): Promise<any> 
	{
		/** map configured items and fetch active status from actor inventory **/
		const configured = this._configured_items.map( ( c: any ) => 
		{
			const item = this._actor.items.get( c.itemId );
			return {
				itemId: c.itemId,
				name: item ? item.name : c.itemName,
				icon: item ? item.img : 'icons/svg/item-bag.svg',
				imagePath: c.imagePath,
				isEquipped: item ? is_item_equipped( item ) : false
			};
		} );

		/** gather remaining available inventory items **/
		const configured_ids = new Set( this._configured_items.map( ( c: any ) => c.itemId ) );
		const available = this._actor.items.filter( ( item: any ) => 
		{
			return is_equippable_item( item ) && !configured_ids.has( item.id );
		} ).map( ( item: any ) => 
		{
			return {
				id: item.id,
				name: item.name,
				img: item.img,
				isEquipped: is_item_equipped( item ),
				searchName: item.name.toLowerCase( )
			};
		} );

		return {
			actorName: this._actor.name,
			actorImg: this._actor.img,
			configuredItems: configured,
			availableItems: available
		};
	}

	/**
	 * binds DOM event listeners for search and button action triggers.
	 **/
	override _onRender( context: any, options: any ): void 
	{
		super._onRender( context, options );
		
		const html = this.element;

		if ( ( html as any )._listeners_bound ) 
		{
			return;
		}
		( html as any )._listeners_bound = true;

		/** prevent normal form submit refreshing the page **/
		html.addEventListener( 'submit', async ( event: Event ) => 
		{
			event.preventDefault( );
			await this._save_configuration( );
			void this.close( );
		} );

		/** setup search filtering listener via delegation **/
		html.addEventListener( 'input', ( event: Event ) => 
		{
			const target = event.target as HTMLInputElement;
			if ( target && target.classList.contains( 'yugen-equip-search-input' ) ) 
			{
				const query = target.value.toLowerCase( ).trim( );
				const rows = html.querySelectorAll( '.yugen-equip-available-row' );
				for ( const row of rows ) 
				{
					const html_row = row as HTMLElement;
					const search_name = html_row.dataset.searchName || '';
					if ( search_name.includes( query ) ) 
					{
						html_row.classList.remove( 'is-hidden' );
					}
					else 
					{
						html_row.classList.add( 'is-hidden' );
					}
				}
			}
		} );

		/** listen for click actions using delegation **/
		html.addEventListener( 'click', ( event: Event ) => 
		{
			const target = ( event.target as HTMLElement ).closest( '[data-action]' ) as HTMLElement;
			if ( !target ) 
			{
				return;
			}

			event.preventDefault( );
			const action = target.dataset.action;
			const itemId = target.dataset.itemId;

			if ( action === 'browse-item' && itemId ) 
			{
				this._on_browse_item( itemId );
			}
			else if ( action === 'add-item' && itemId ) 
			{
				this._on_add_item( itemId );
			}
			else if ( action === 'remove-item' && itemId ) 
			{
				this._on_remove_item( itemId );
			}
		} );
	}

	/**
	 * syncs active input values from the DOM to the internal memory array to prevent data loss.
	 **/
	private _sync_inputs_to_memory( ): void 
	{
		for ( const config of this._configured_items ) 
		{
			const input = this.element.querySelector( `input[name="image_${ config.itemId }"]` ) as HTMLInputElement;
			if ( input ) 
			{
				config.imagePath = input.value;
			}
		}


	}

	/**
	 * handles adding an inventory item to the configured list.
	 **/
	private _on_add_item( itemId: string ): void 
	{
		this._sync_inputs_to_memory( );

		const item = this._actor.items.get( itemId );
		if ( item ) 
		{
			this._configured_items.push( {
				itemId: item.id,
				itemName: item.name,
				imagePath: ''
			} );
			
			this.render( );
		}
	}

	/**
	 * handles removing an item from the configured list.
	 **/
	private _on_remove_item( itemId: string ): void 
	{
		this._sync_inputs_to_memory( );

		this._configured_items = this._configured_items.filter( ( c: any ) => 
		{
			return c.itemId !== itemId;
		} );

		this.render( );
	}



	/**
	 * opens a file picker dialog for a specific configured item.
	 **/
	private _on_browse_item( itemId: string ): void 
	{
		const input = this.element.querySelector( `input[name="image_${ itemId }"]` ) as HTMLInputElement;

		const FilePickerClass = typeof foundry !== 'undefined' && ( foundry.applications as any )?.apps?.FilePicker?.implementation
			? ( foundry.applications as any ).apps.FilePicker.implementation
			: ( globalThis as any ).FilePicker;

		const picker = new FilePickerClass( {
			type: 'image',
			current: input ? input.value : '',
			callback: ( path: string ) => 
			{
				if ( input ) 
				{
					input.value = path;
					
					/** sync image path directly to configurations list **/
					const config = this._configured_items.find( ( c: any ) => 
					{
						return c.itemId === itemId;
					} );
					if ( config ) 
					{
						config.imagePath = path;
					}
				}
			}
		} );

		picker.browse( );
	}

	/**
	 * saves the configuration flags to the actor and triggers token re-evaluation.
	 **/
	private async _save_configuration( ): Promise<void> 
	{
		this._sync_inputs_to_memory( );

		/** set namespaced flags on actor **/
		await ( globalThis as any ).yugen_utils.set_flag( this._actor, 'yugen-modifiers', 'configurations', this._configured_items, { yugen_modifier_update: true } );

		/** trigger token re-evaluation via imported service **/
		await reevaluate_token_image( this._actor );
	}
}
