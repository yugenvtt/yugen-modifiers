/**
 * @file src/module/utils.ts
 * system-agnostic helper functions for the yugen-modifiers module.
 **/

/**
 * determines if an item document is currently equipped on its actor in a system-agnostic way.
 **/
export function is_item_equipped( item: any ): boolean 
{
	if ( !item || !item.system ) 
	{
		return false;
	}

	const equipped = item.system.equipped;

	if ( typeof equipped === 'boolean' ) 
	{
		return equipped;
	}

	if ( equipped && typeof equipped === 'object' ) 
	{
		if ( typeof equipped.value === 'boolean' ) 
		{
			return equipped.value;
		}

		if ( typeof equipped.carryType === 'string' ) 
		{
			const carry = equipped.carryType.toLowerCase( );
			return carry === 'equipped' || carry === 'worn' || carry === 'held';
		}
	}

	/** fallback for other systems **/
	if ( typeof item.system.equipped === 'string' ) 
	{
		const str = item.system.equipped.toLowerCase( );
		return str === 'equipped' || str === 'worn' || str === 'held' || str === 'true';
	}

	return false;
}

/**
 * checks if an item can potentially be equipped/unequipped.
 **/
export function is_equippable_item( item: any ): boolean 
{
	if ( !item ) 
	{
		return false;
	}

	const non_equippable_types = new Set( [ 
		'spell', 
		'class', 
		'subclass', 
		'feat', 
		'background', 
		'race', 
		'effect', 
		'theme', 
		'heritage', 
		'ancestry',
		'action',
		'ability'
	] );

	if ( non_equippable_types.has( item.type ) ) 
	{
		return false;
	}

	/** check if there is an equipment status or system properties indicating physical inventory **/
	if ( item.system && ( 'equipped' in item.system || 'quantity' in item.system ) ) 
	{
		return true;
	}

	return false;
}
