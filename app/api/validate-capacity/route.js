import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validateCapacity } from '@/lib/capacityValidation';

export async function POST(request) {
  try {
    const body = await request.json();
    const { vehicleCategoryId, passengerCount, luggageCount } = body;

    if (!vehicleCategoryId) {
      return NextResponse.json({ valid: false, reason: 'Vehicle category is required.' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: category, error } = await supabase
      .from('vehicle_categories')
      .select('id, name, passenger_capacity, luggage_capacity, active, bookable')
      .eq('id', vehicleCategoryId)
      .eq('active', true)
      .eq('bookable', true)
      .single();

    if (error || !category) {
      return NextResponse.json({ valid: false, reason: 'Selected vehicle category is unavailable.' }, { status: 404 });
    }

    const result = validateCapacity({
      passengerCount,
      luggageCount,
      passengerCapacity: category.passenger_capacity,
      luggageCapacity: category.luggage_capacity,
    });

    return NextResponse.json({ ...result, category });
  } catch {
    return NextResponse.json({ valid: false, reason: 'Unable to validate vehicle capacity.' }, { status: 400 });
  }
}
