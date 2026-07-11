/**
 * @file src/module/token-hover-manager.ts
 * manages the hover tooltip UI for token temporary effects and conditions.
 **/

export class TokenHoverManager 
{
	private static active_token: any = null;
	private static tooltip_element: HTMLDivElement | null = null;
	private static hover_timeout: number | null = null;

	/**
	 * handles the hover enter and exit events for a token
	 **/
	public static handle_hover( token: any, hovered: boolean ): void 
	{
		/** retrieve setting for token hover effects **/
		const is_enabled = ( game as any ).settings.get( 'yugen-modifiers', 'enable-token-hover-effects' );
		if ( !is_enabled ) 
		{
			return;
		}

		if ( hovered ) 
		{
			this.clear_hover_timer( );

			this.active_token = token;

			/** set a short delay before displaying to prevent flickering **/
			this.hover_timeout = window.setTimeout( ( ) => 
			{
				this.render_tooltip( token );
			}, 150 );
		}
		else 
		{
			if ( this.active_token && this.active_token.id === token.id ) 
			{
				this.destroy( );
			}
		}
	}

	/**
	 * clears the active hover timeout
	 **/
	private static clear_hover_timer( ): void 
	{
		if ( this.hover_timeout ) 
		{
			window.clearTimeout( this.hover_timeout );
			this.hover_timeout = null;
		}
	}

	/**
	 * destroys the active tooltip element and resets state
	 **/
	public static destroy( ): void 
	{
		this.clear_hover_timer( );
		this.active_token = null;

		if ( this.tooltip_element ) 
		{
			this.tooltip_element.remove( );
			this.tooltip_element = null;
		}
	}

	/**
	 * renders the tooltip containing the token's temporary effects
	 **/
	private static render_tooltip( token: any ): void 
	{
		const actor = token.actor;
		if ( !actor ) 
		{
			return;
		}

		const effects: any[] = 
		[
		];

		/** retrieve active effects, conditions, and temporary effects **/
		try 
		{
			if ( actor.effects ) 
			{
				for ( const effect of actor.effects ) 
				{
					/** verify the effect is enabled and active **/
					if ( effect.disabled ) 
					{
						continue;
					}

					const name = effect.name || effect.label;
					const img = effect.img || effect.icon;
					
					if ( !name && !img ) 
					{
						continue;
					}

					const statuses = effect.statuses;
					const has_status = ( status_name: string ) => 
					{
						if ( !statuses ) 
						{
							return false;
						}
						if ( typeof statuses.has === 'function' ) 
						{
							return statuses.has( status_name );
						}
						if ( typeof statuses.includes === 'function' ) 
						{
							return statuses.includes( status_name );
						}
						return false;
					};

					const has_statuses = statuses && ( 
						( typeof statuses.size === 'number' && statuses.size > 0 ) || 
						( typeof statuses.length === 'number' && statuses.length > 0 ) 
					);

					const has_status_id = effect.getFlag( 'core', 'statusId' ) || effect.getFlag( 'dnd5e', 'statusId' );
					const is_temporary = effect.isTemporary;

					/** only include temporary effects or conditions **/
					if ( !is_temporary && !has_statuses && !has_status_id ) 
					{
						continue;
					}

					/** retrieve status flag from active effect **/
					const is_concentration = has_status( 'concentration' ) || effect.getFlag( 'core', 'statusId' ) === 'concentration';
					let extra_info = '';

					if ( is_concentration ) 
					{
						/** retrieve concentration details from actor **/
						const conc_flag = actor.getFlag( 'dnd5e', 'concentration' );
						if ( conc_flag?.name ) 
						{
							extra_info = conc_flag.name;
						}
					}

					let duration_str = '';
					if ( effect.duration ) 
					{
						if ( effect.duration.label ) 
						{
							duration_str = effect.duration.label;
						}
						else if ( effect.duration.remaining ) 
						{
							duration_str = `${ effect.duration.remaining }s`;
						}
					}

					effects.push( 
					{
						id: effect.id,
						name: name || '',
						img: img || '',
						is_concentration: is_concentration,
						extra_info: extra_info,
						duration: duration_str,
						type: 'effect'
					} );
				}
			}
		}
		catch ( error ) 
		{
			console.error( 'yugen-modifiers | error parsing active effects:', error );
		}

		/** extract pf2e conditions and effects **/
		if ( actor.itemTypes ) 
		{
			if ( actor.itemTypes.condition ) 
			{
				for ( const condition of actor.itemTypes.condition ) 
				{
					const name = condition.name;
					const img = condition.img;
					const value = condition.system?.value?.value;
					const name_with_value = value ? `${ name } ${ value }` : name;

					effects.push( 
					{
						id: condition.id,
						name: name_with_value || '',
						img: img || '',
						is_concentration: false,
						extra_info: '',
						duration: '',
						type: 'condition'
					} );
				}
			}

			if ( actor.itemTypes.effect ) 
			{
				for ( const pf2effect of actor.itemTypes.effect ) 
				{
					const name = pf2effect.name;
					const img = pf2effect.img;
					
					let duration_str = '';
					if ( pf2effect.system?.duration ) 
					{
						const value = pf2effect.system.duration.value;
						const unit = pf2effect.system.duration.unit;
						if ( value && unit ) 
						{
							duration_str = `${ value }${ unit.charAt( 0 ) }`;
						}
					}

					effects.push( 
					{
						id: pf2effect.id,
						name: name || '',
						img: img || '',
						is_concentration: false,
						extra_info: '',
						duration: duration_str,
						type: 'effect'
					} );
				}
			}
		}

		/** retrieve setting for showing non-physical weapons **/
		const show_non_physical = ( game as any ).settings.get( 'yugen-modifiers', 'show-non-physical-weapons' );

		const weapons: any[] = 
		[
		];

		/** retrieve equipped weapons from actor items **/
		if ( actor.items ) 
		{
			for ( const item of actor.items ) 
			{
				const is_equipped_weapon = item.type === 'weapon' && ( 
					item.system?.equipped === true || 
					item.system?.equipped?.carryType === 'held' || 
					item.system?.equipped?.carryType === 'worn' || 
					item.system?.equipped?.value === true 
				);

				if ( is_equipped_weapon ) 
				{
					/** check if the weapon is non-physical/action **/
					const weapon_type = item.system?.type?.value || item.system?.weaponType;
					const is_natural_dnd = weapon_type === 'natural' || weapon_type === 'special';
					
					const category = item.system?.category;
					const traits = item.system?.traits?.value || 
					[
					];
					const is_unarmed_pf = category === 'unarmed' || traits.includes( 'unarmed' );

					const is_non_physical = is_natural_dnd || is_unarmed_pf;

					if ( is_non_physical && !show_non_physical ) 
					{
						continue;
					}

					let equip_type = 'Equipped';
					if ( item.system?.equipped?.carryType === 'held' ) 
					{
						equip_type = 'Held';
					}

					weapons.push( 
					{
						id: item.id,
						name: item.name || '',
						img: item.img || '',
						equip_type: equip_type
					} );
				}
			}
		}

		const seen = new Set<string>( );
		const unique_effects = effects.filter( ( eff ) => 
		{
			const key = `${ eff.name }-${ eff.img }`;
			if ( seen.has( key ) ) 
			{
				return false;
			}
			seen.add( key );
			return true;
		} );

		/** retrieve setting for showing equipped armor **/
		const show_armor = ( game as any ).settings.get( 'yugen-modifiers', 'show-equipped-armor' );

		const armor: any[] = 
		[
		];

		/** retrieve equipped armor and shields from actor items **/
		if ( actor.items && show_armor ) 
		{
			for ( const item of actor.items ) 
			{
				const eq_type = item.system?.type?.value;
				const is_armor_dnd = eq_type === 'light' || eq_type === 'medium' || eq_type === 'heavy' || eq_type === 'shield';

				const is_armor_item = item.type === 'armor' || item.type === 'shield' || ( 
					item.type === 'equipment' && ( 
						is_armor_dnd || 
						item.system?.armor?.type || 
						item.system?.type?.value === 'armor' || 
						item.system?.type?.value === 'shield' 
					) 
				);

				const is_equipped_armor = is_armor_item && ( 
					item.system?.equipped === true || 
					item.system?.equipped?.carryType === 'worn' || 
					item.system?.equipped?.carryType === 'held' || 
					item.system?.equipped?.value === true 
				);

				if ( is_equipped_armor ) 
				{
					let equip_type = 'Equipped';
					if ( item.system?.equipped?.carryType === 'held' ) 
					{
						equip_type = 'Held';
					}

					armor.push( 
					{
						id: item.id,
						name: item.name || '',
						img: item.img || '',
						equip_type: equip_type
					} );
				}
			}
		}

		if ( unique_effects.length === 0 && weapons.length === 0 && armor.length === 0 ) 
		{
			return;
		}

		/** retrieve settings for hiding name and showing race **/
		const hide_name = ( game as any ).settings.get( 'yugen-modifiers', 'hide-token-name' );
		const show_race = ( game as any ).settings.get( 'yugen-modifiers', 'show-token-race' );

		let race_str = '';
		if ( show_race ) 
		{
			let race = '';
			if ( actor.system?.details?.race ) 
			{
				race = typeof actor.system.details.race === 'string'
					? actor.system.details.race
					: ( actor.system.details.race.name || '' );
			}

			if ( !race ) 
			{
				/** check for race or ancestry item in actor items **/
				const race_item = actor.items?.find( ( i: any ) => 
					i.type === 'race' || 
					i.type === 'ancestry' 
				);

				if ( race_item ) 
				{
					race = race_item.name;
				}
			}

			if ( race ) 
			{
				race_str = race;
			}
		}

		let header_text = '';
		const token_name = token.name || actor.name || 'Token';

		if ( hide_name ) 
		{
			header_text = race_str ? race_str : 'Token Details';
		}
		else 
		{
			header_text = race_str ? `${ token_name } (${ race_str })` : token_name;
		}

		/** retrieve setting for enabling health condition **/
		const show_health = ( game as any ).settings.get( 'yugen-modifiers', 'enable-health-condition' );
		let health_badge: HTMLSpanElement | null = null;

		if ( show_health ) 
		{
			const hp = actor.system?.attributes?.hp;
			if ( hp && hp.max > 0 ) 
			{
				const current = hp.value ?? 0;
				const max = hp.max;
				const hp_pct = Math.round( ( current / max ) * 100 );

				let setting_key = 'health-label-0';
				let badge_class = 'dead';

				if ( hp_pct >= 100 ) 
				{
					setting_key = 'health-label-100';
					badge_class = 'healthy';
				}
				else if ( hp_pct >= 75 ) 
				{
					setting_key = 'health-label-75';
					badge_class = 'injured';
				}
				else if ( hp_pct >= 50 ) 
				{
					setting_key = 'health-label-50';
					badge_class = 'wounded';
				}
				else if ( hp_pct >= 25 ) 
				{
					setting_key = 'health-label-25';
					badge_class = 'severely-wounded';
				}
				else if ( hp_pct >= 1 ) 
				{
					setting_key = 'health-label-10';
					badge_class = 'near-death';
				}

				/** retrieve health label string from settings **/
				const label_text = ( game as any ).settings.get( 'yugen-modifiers', setting_key );

				health_badge = document.createElement( 'span' );
				health_badge.className = `yugen-modifiers-token-health-badge ${ badge_class }`;
				health_badge.innerText = label_text;
			}
		}

		this.destroy( );

		this.tooltip_element = document.createElement( 'div' );
		this.tooltip_element.className = 'yugen-modifiers-token-tooltip';

		const header = document.createElement( 'div' );
		header.className = 'yugen-modifiers-token-header';

		const name_span = document.createElement( 'span' );
		name_span.className = 'yugen-modifiers-token-name';
		name_span.innerText = header_text;
		header.appendChild( name_span );

		this.tooltip_element.appendChild( header );

		const divider = document.createElement( 'div' );
		divider.className = 'yugen-modifiers-token-divider';
		this.tooltip_element.appendChild( divider );

		/** render health condition row if present **/
		if ( health_badge ) 
		{
			const health_row = document.createElement( 'div' );
			health_row.className = 'yugen-modifiers-token-health-row';
			health_row.appendChild( health_badge );
			this.tooltip_element.appendChild( health_row );

			const health_divider = document.createElement( 'div' );
			health_divider.className = 'yugen-modifiers-token-divider';
			health_divider.style.marginTop = '8px';
			this.tooltip_element.appendChild( health_divider );
		}

		/** render equipped weapons section **/
		const weapons_title = document.createElement( 'div' );
		weapons_title.className = 'yugen-modifiers-token-section-title';
		weapons_title.innerText = 'Equipped Weapons';
		this.tooltip_element.appendChild( weapons_title );

		const weapons_list = document.createElement( 'div' );
		weapons_list.className = 'yugen-modifiers-token-list';

		if ( weapons.length > 0 ) 
		{
			for ( const weapon of weapons ) 
			{
				const item = document.createElement( 'div' );
				item.className = 'yugen-modifiers-token-item';

				if ( weapon.img ) 
				{
					const icon = document.createElement( 'img' );
					icon.className = 'yugen-modifiers-token-icon';
					icon.src = weapon.img;
					item.appendChild( icon );
				}

				const info = document.createElement( 'div' );
				info.className = 'yugen-modifiers-token-info';

				const label = document.createElement( 'span' );
				label.className = 'yugen-modifiers-token-label';
				label.innerText = weapon.name;
				info.appendChild( label );

				const extra = document.createElement( 'span' );
				extra.className = 'yugen-modifiers-token-extra';
				extra.innerText = weapon.equip_type;
				info.appendChild( extra );

				item.appendChild( info );
				weapons_list.appendChild( item );
			}
		}
		else 
		{
			const no_weapon = document.createElement( 'div' );
			no_weapon.className = 'yugen-modifiers-token-no-item';
			no_weapon.innerText = 'No weapon';
			weapons_list.appendChild( no_weapon );
		}

		this.tooltip_element.appendChild( weapons_list );

		/** render equipped armor section if present **/
		if ( armor.length > 0 ) 
		{
			const inner_divider = document.createElement( 'div' );
			inner_divider.className = 'yugen-modifiers-token-divider';
			inner_divider.style.marginTop = '8px';
			this.tooltip_element.appendChild( inner_divider );

			const armor_title = document.createElement( 'div' );
			armor_title.className = 'yugen-modifiers-token-section-title';
			armor_title.innerText = 'Equipped Armor';
			this.tooltip_element.appendChild( armor_title );

			const armor_list = document.createElement( 'div' );
			armor_list.className = 'yugen-modifiers-token-list';

			for ( const item_data of armor ) 
			{
				const item = document.createElement( 'div' );
				item.className = 'yugen-modifiers-token-item';

				if ( item_data.img ) 
				{
					const icon = document.createElement( 'img' );
					icon.className = 'yugen-modifiers-token-icon';
					icon.src = item_data.img;
					item.appendChild( icon );
				}

				const info = document.createElement( 'div' );
				info.className = 'yugen-modifiers-token-info';

				const label = document.createElement( 'span' );
				label.className = 'yugen-modifiers-token-label';
				label.innerText = item_data.name;
				info.appendChild( label );

				const extra = document.createElement( 'span' );
				extra.className = 'yugen-modifiers-token-extra';
				extra.innerText = item_data.equip_type;
				info.appendChild( extra );

				item.appendChild( info );
				armor_list.appendChild( item );
			}

			this.tooltip_element.appendChild( armor_list );
		}

		/** render active effects section if present **/
		if ( unique_effects.length > 0 ) 
		{
			const inner_divider = document.createElement( 'div' );
			inner_divider.className = 'yugen-modifiers-token-divider';
			inner_divider.style.marginTop = '8px';
			this.tooltip_element.appendChild( inner_divider );

			const effects_title = document.createElement( 'div' );
			effects_title.className = 'yugen-modifiers-token-section-title';
			effects_title.innerText = 'Effects & Conditions';
			this.tooltip_element.appendChild( effects_title );

			const list = document.createElement( 'div' );
			list.className = 'yugen-modifiers-token-list';

			for ( const effect of unique_effects ) 
			{
				const item = document.createElement( 'div' );
				item.className = 'yugen-modifiers-token-item';
				if ( effect.is_concentration ) 
				{
					item.classList.add( 'concentration' );
				}

				if ( effect.img ) 
				{
					const icon = document.createElement( 'img' );
					icon.className = 'yugen-modifiers-token-icon';
					icon.src = effect.img;
					item.appendChild( icon );
				}

				const info = document.createElement( 'div' );
				info.className = 'yugen-modifiers-token-info';

				const label = document.createElement( 'span' );
				label.className = 'yugen-modifiers-token-label';
				label.innerText = effect.name;
				info.appendChild( label );

				if ( effect.extra_info && !effect.name.toLowerCase( ).includes( effect.extra_info.toLowerCase( ) ) ) 
				{
					const extra = document.createElement( 'span' );
					extra.className = 'yugen-modifiers-token-extra';
					extra.innerText = effect.extra_info;
					info.appendChild( extra );
				}

				item.appendChild( info );

				if ( effect.duration ) 
				{
					const duration_span = document.createElement( 'span' );
					duration_span.className = 'yugen-modifiers-token-duration';
					duration_span.innerText = effect.duration;
					item.appendChild( duration_span );
				}

				list.appendChild( item );
			}

			this.tooltip_element.appendChild( list );
		}

		document.body.appendChild( this.tooltip_element );

		this.position_tooltip( token );

		window.requestAnimationFrame( ( ) => 
		{
			this.tooltip_element?.classList.add( 'visible' );
		} );
	}

	/**
	 * calculates and sets the tooltip element screen position
	 **/
	private static position_tooltip( token: any ): void 
	{
		if ( !this.tooltip_element ) 
		{
			return;
		}

		const canvas = ( game as any ).canvas;
		if ( !canvas || !canvas.stage ) 
		{
			return;
		}

		const screen_pos = 
		{
			x: token.worldTransform.tx,
			y: token.worldTransform.ty
		};
		
		const scale = canvas.stage.scale.x;
		const token_width = token.w * scale;
		const token_height = token.h * scale;

		const tooltip_width = this.tooltip_element.offsetWidth;
		const tooltip_height = this.tooltip_element.offsetHeight;

		const window_width = window.innerWidth;
		const window_height = window.innerHeight;

		let final_x = screen_pos.x + token_width + 12;
		let final_y = screen_pos.y + ( token_height - tooltip_height ) / 2;

		if ( final_x + tooltip_width > window_width ) 
		{
			final_x = screen_pos.x - tooltip_width - 12;
		}

		if ( final_y < 12 ) 
		{
			final_y = 12;
		}
		else if ( final_y + tooltip_height > window_height - 12 ) 
		{
			final_y = window_height - tooltip_height - 12;
		}

		final_x = Math.max( 12, Math.min( final_x, window_width - tooltip_width - 12 ) );
		final_y = Math.max( 12, Math.min( final_y, window_height - tooltip_height - 12 ) );

		this.tooltip_element.style.left = `${ final_x }px`;
		this.tooltip_element.style.top = `${ final_y }px`;
	}
}
