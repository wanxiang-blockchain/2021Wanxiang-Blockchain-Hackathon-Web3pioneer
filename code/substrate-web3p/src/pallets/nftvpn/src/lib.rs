#![cfg_attr(not(feature = "std"), no_std)]

/// Edit this file to define custom logic or remove it if it is not needed.
/// Learn more about FRAME and the core library of Substrate FRAME pallets:
/// <https://substrate.dev/docs/en/knowledgebase/runtime/frame>
pub use pallet::*;

#[cfg(test)]
mod mock;

#[cfg(test)]
mod tests;

#[cfg(feature = "runtime-benchmarks")]
mod benchmarking;

#[frame_support::pallet]
pub mod pallet {
	use sp_std::{convert::TryInto, vec::Vec};	
	use frame_support::{dispatch::DispatchResult, pallet_prelude::*, traits::{Currency, ReservableCurrency, ExistenceRequirement} };
	use frame_system::pallet_prelude::*;

	pub type VpnId = u32;
	type AreaId = u16;

	pub type BalanceOf<T> =
            <<T as Config>::Currency as Currency<<T as frame_system::Config>::AccountId>>::Balance;

	/// Configure the pallet by specifying the parameters and types on which it depends.
	#[pallet::config]
	pub trait Config: frame_system::Config {
		/// Because this pallet emits events, it depends on the runtime's definition of an event.
		type Event: From<Event<Self>> + IsType<<Self as frame_system::Config>::Event>;
		
		type Currency: Currency<Self::AccountId>  + ReservableCurrency<Self::AccountId>;
	}

	#[pallet::pallet]
	#[pallet::generate_store(pub(super) trait Store)]
	pub struct Pallet<T>(_);

	// The pallet's runtime storage items.
	// https://substrate.dev/docs/en/knowledgebase/runtime/storage
	#[pallet::storage]
	#[pallet::getter(fn something)]
	// Learn more about declaring storage items:
	// https://substrate.dev/docs/en/knowledgebase/runtime/storage#declaring-storage-items
	pub type Something<T> = StorageValue<_, u32>;

	// Pallets use events to inform users when important changes are made.
	// https://substrate.dev/docs/en/knowledgebase/runtime/events
	#[pallet::event]
	#[pallet::metadata(T::AccountId = "AccountId")]
	#[pallet::generate_deposit(pub(super) fn deposit_event)]
	pub enum Event<T: Config> {
		/// Event documentation should end with an array that provides descriptive names for event
		/// parameters. [something, who]
		SomethingStored(u32, T::AccountId),
		VpnMint(T::AccountId, VpnId),
		VpnAdvertise(T::AccountId, AreaId),
		VpnPrice(T::AccountId, VpnId, Option<BalanceOf<T>>),
		VpnUse(T::AccountId, T::AccountId, VpnId, BalanceOf<T>),
	}

	

	#[pallet::storage]
    #[pallet::getter(fn vpn_count)]
    pub type VpnCount<T> = StorageValue<_, u32>;

	#[pallet::storage]
	#[pallet::getter(fn vpns)]
	pub type Vpns<T> = StorageMap<_, Blake2_128Concat, VpnId, (Vec<u8>, Vec<u8>, u16, BalanceOf<T>), ValueQuery>;//存的是ex_id与title, 最大使用数与抵押额

	/// Mapping from vpn to owner.
	#[pallet::storage]
	#[pallet::getter(fn vpn_owner)]
	pub type VpnOwner<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, Option<T::AccountId>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn ower_vpns)]
	pub type OwnerVpns<T: Config> = StorageDoubleMap<
        _, 
        Identity, 
        T::AccountId, 
        Identity, 
        VpnId, 
        T::BlockNumber,
        ValueQuery
    >;

	/// Mapping from vpn to approvals users.
	#[pallet::storage]
	#[pallet::getter(fn vpn_approvals)]
	pub type vpn_approvals<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, Option<T::AccountId>, ValueQuery>;
	
	
	#[pallet::storage]
	#[pallet::getter(fn advertise_vpns)]
	pub type AdvertiseVpns<T: Config> = StorageDoubleMap<
        _, 
        Blake2_128Concat, 
        AreaId, 
        Blake2_128Concat, 
        T::AccountId, 
        (Vec<u8>, Vec<u8>, Vec<VpnId>),
        ValueQuery
    >;

	//pub type AdvertiseVpns<T: Config> = StorageDoubleMap<_, Blake2_128Concat, AreaId, Blake2_128Concat, T::AccountId, (Vec<u8>, Vec<VpnId>), ValueQuery>; //区块，推荐人，推荐说明，推荐列表



	/// Get kitty price. None means not for sale.
	#[pallet::storage]
	#[pallet::getter(fn vpn_prices)]
	pub type VpnPrices<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, Option<BalanceOf<T>>, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn vpn_used_count)]
	pub type VpnUsedCount<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, u16, OptionQuery>;

	#[pallet::storage]
	#[pallet::getter(fn vpn_to_create)]
	pub type VpnToCreate<T: Config> = StorageDoubleMap<
        _, 
        Identity, 
        VpnId, 
        Identity, 
        T::BlockNumber, 
        (T::AccountId, Vec<u8>),
        OptionQuery
    >;
	
	#[pallet::storage]
	#[pallet::getter(fn vpn_rank)]
	pub type vpn_rank<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, u16, ValueQuery>;

	#[pallet::storage]
	#[pallet::getter(fn vpn_rank_summary)]
	pub type vpn_rank_summary<T: Config> = StorageMap<_, Blake2_128Concat, VpnId, (u16, u16), ValueQuery>; //评价次数与总的星数

	


	//  /// Mapping from owner to operator approvals.
	//  #[pallet::storage]
	//  #[pallet::getter(fn operator_approvals)]
	//  pub type operator_approvals<T: Config> = StorageMap<_, Blake2_128Concat, (T::AccountId, AccountId), bool, ValueQuery>;



	// Errors inform users that something went wrong.
	#[pallet::error]
	pub enum Error<T> {
		/// Error names should be descriptive.
		NoneValue,
		/// Errors should have helpful documentation associated with them.
		StorageOverflow,
		RequireOwner,
		InvalidVpnId,
		NotForSale,
		PriceTooLow,
		UserTooMore,
		KittiesCountOverflow,
	}

	// Dispatchable functions allows users to interact with the pallet and invoke state changes.
	// These functions materialize as "extrinsics", which are often compared to transactions.
	// Dispatchable functions must be annotated with a weight and must return a DispatchResult.
	#[pallet::call]
	impl<T: Config> Pallet<T> {
		/// An example dispatchable that takes a singles value as a parameter, writes the value to
		/// storage and emits an event. This function must be dispatched by a signed extrinsic.
		#[pallet::weight(10_000 + T::DbWeight::get().writes(1))]
		pub fn do_something(origin: OriginFor<T>, something: u32) -> DispatchResult {
			// Check that the extrinsic was signed and get the signer.
			// This function will return an error if the extrinsic is not signed.
			// https://substrate.dev/docs/en/knowledgebase/runtime/origin
			let who = ensure_signed(origin)?;

			// Update storage.
			<Something<T>>::put(something);

			// Emit an event.
			Self::deposit_event(Event::SomethingStored(something, who));
			// Return a successful DispatchResultWithPostInfo
			Ok(())
		}

		#[pallet::weight(1000)]
        pub fn mint(origin: OriginFor<T>
			, exid: Vec<u8>
			, title: Vec<u8>
			, max_use: u16
			, pledge: BalanceOf<T>
			
		) -> DispatchResult {
            let who = ensure_signed(origin)?;
			let current_block = <frame_system::Module<T>>::block_number();

            let vpn_id = match Self::vpn_count() {
                Some(id) => {
                    ensure!(id != VpnId::max_value(), Error::<T>::KittiesCountOverflow);
                    id
                },
                None => 0
            };

			//TODO  要进行抵押， 有设置一个最低的抵押额度

            Vpns::<T>::insert(vpn_id, (exid, title, max_use, pledge));

            VpnOwner::<T>::insert(vpn_id, Some(who.clone()));

			OwnerVpns::<T>::insert(&who, vpn_id, current_block);

            VpnCount::<T>::put(vpn_id + 1);

            Self::deposit_event(Event::VpnMint(who, vpn_id));

            Ok(())
        }
		
		#[pallet::weight(1000)]
		pub fn advertise_for(origin: OriginFor<T>
			, area_id: AreaId
			, title: Vec<u8>
			, slogan: Vec<u8>
			, vpn_ids: Vec<VpnId>
			
		) -> DispatchResult {
			let who = ensure_signed(origin)?;
			let current_block = <frame_system::Module<T>>::block_number();
			
			AdvertiseVpns::<T>::insert(area_id, &who,  (title.clone(), slogan.clone(), vpn_ids.clone() )  );

			Self::deposit_event(Event::VpnAdvertise(who, area_id));
		
			Ok(())
		}		


		/// Set a price for a kitty for sale
		/// None to delist the kitty
		#[pallet::weight(1000)]
		pub fn offer(origin: OriginFor<T>, vpn_id: VpnId, new_price: Option<BalanceOf<T>>
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;

			ensure!(<OwnerVpns<T>>::contains_key(&sender, vpn_id), Error::<T>::RequireOwner);

			VpnPrices::<T>::insert(vpn_id, new_price);
			//<VpnPrices<T>>::mutate_exists(vpn_id, |price| *price = new_price);

			Self::deposit_event(Event::VpnPrice(sender, vpn_id, new_price));

			Ok(())
		}


		/// Buy a kitty
		#[pallet::weight(1000)]
		pub fn use_vpn(origin: OriginFor<T>, vpn_id: VpnId, token_md5: Vec<u8>, price: BalanceOf<T>
		) -> DispatchResult {
			let sender = ensure_signed(origin)?;
			let current_block = <frame_system::Module<T>>::block_number();

			let owner = Self::vpn_owner(vpn_id).ok_or(Error::<T>::InvalidVpnId)?;

			let vpn_price = Self::vpn_prices(vpn_id).ok_or(Error::<T>::NotForSale)?;

			let  (exid, title, max_use, pledge) = Self::vpns(vpn_id);

			let use_count = match Self::vpn_used_count(vpn_id) {
                Some(id) => id,
                None => 0
            };

			ensure!(price >= vpn_price, Error::<T>::PriceTooLow);
			ensure!(max_use>= use_count, Error::<T>::UserTooMore);

			T::Currency::transfer(&sender, &owner, price, ExistenceRequirement::AllowDeath)?;

			VpnUsedCount::<T>::insert(vpn_id, use_count+1 );
			VpnToCreate::<T>::insert(vpn_id, current_block, (&sender, token_md5));
			//<KittyPrices<T>>::remove(kitty_id);
			//Self::do_transfer(&owner, &sender, kitty_id);

			Self::deposit_event(Event::VpnUse(owner, sender, vpn_id, price));

			Ok(())
		}

		/// An example dispatchable that may throw a custom error.
		#[pallet::weight(10_000 + T::DbWeight::get().reads_writes(1,1))]
		pub fn cause_error(origin: OriginFor<T>) -> DispatchResult {
			let _who = ensure_signed(origin)?;

			// Read a value from storage.
			match <Something<T>>::get() {
				// Return an error if the value has not been set.
				None => Err(Error::<T>::NoneValue)?,
				Some(old) => {
					// Increment the value read from storage; will error in the event of overflow.
					let new = old.checked_add(1).ok_or(Error::<T>::StorageOverflow)?;
					// Update the value in storage with the incremented result.
					<Something<T>>::put(new);
					Ok(())
				},
			}
		}
	}


	impl<T: Config> Pallet<T> {


		pub fn test() -> u32 {
			Self::something().unwrap_or(0)
		}
			
		
    }
}
