import { supabase } from './supabase';

export const getProducts = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

/**
 * Fetches products with optional server-side filters.
 * @param {object} options
 * @param {string}      options.category  - filter by category string, or '' for all
 * @param {boolean|null} options.status   - filter by status (true/false/null)
 * @param {object|null} options.dateRange - { from: ISO, to: ISO } or null
 * @param {string}      options.search    - text search on name / product_id / category
 */
export const getFilteredProducts = async ({
  category = '',
  status = null,
  dateRange = null,
  search = '',
} = {}) => {
  let query = supabase.from('products').select('*');

  if (category && category !== 'All') query = query.eq('category', category);
  if (status !== null) query = query.eq('status', status);
  if (dateRange?.from) query = query.gte('created_at', dateRange.from);
  if (dateRange?.to)   query = query.lte('created_at', dateRange.to);

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;
  if (error) throw error;

  let result = data || [];

  if (search.trim()) {
    const q = search.toLowerCase();
    result = result.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) ||
        p.product_id?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }

  return result;
};

/**
 * Fetches distinct categories dynamically from the database.
 */
export const getProductCategories = async () => {
  const { data, error } = await supabase
    .from('products')
    .select('category');
  if (error) throw error;
  const list = (data || []).map((p) => p.category).filter(Boolean);
  const distinct = [...new Set(list)].sort();
  return ['All', ...distinct];
};

  export const addProduct = async (
  productData
) => {
  const { data, error } =
    await supabase
      .from('products')
      .insert(productData)
      .select()
      .single();

  if (error) throw error;

  return data;
};

export const updateProduct =
  async (id, productData) => {
    const { data, error } =
      await supabase
        .from('products')
        .update(productData)
        .eq('id', id)
        .select()
        .single();

    if (error) throw error;

    return data;
  };

export const deleteProduct =
  async (id) => {
    const { error } =
      await supabase
        .from('products')
        .delete()
        .eq('id', id);

    if (error) throw error;
  };

  export const getProductById = async (
  id
) => {
  const { data, error } =
    await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

  if (error) throw error;

  return data;
};

export const getCategories = async () => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('category');
    if (error) throw error;

    const list = (data || []).map((p) => p.category).filter(Boolean);
    const distinct = [...new Set(list)].sort();

    return distinct.map((cat) => ({
      id: cat,
      name: cat,
      description: '',
      image_url: '',
    }));
  } catch (err) {
    console.error('getCategories database fetch failed:', err);
    throw err;
  }
};

export const getSizesByCategory = async (categoryId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('size')
      .eq('category', categoryId)
      .eq('status', true);
    if (error) throw error;

    const list = (data || []).map((v) => v.size).filter(Boolean);
    return [...new Set(list)].sort();
  } catch (err) {
    console.error('getSizesByCategory database fetch failed:', err);
    throw err;
  }
};

export const getColorsByCategoryAndSize = async (categoryId, size) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('color')
      .eq('category', categoryId)
      .eq('size', size)
      .eq('status', true);
    if (error) throw error;

    const list = (data || []).map((v) => v.color).filter(Boolean);
    return [...new Set(list)].sort();
  } catch (err) {
    console.error('getColorsByCategoryAndSize database fetch failed:', err);
    throw err;
  }
};

export const getCapacitiesByCategorySizeAndColor = async (categoryId, size, color) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('weight, unit')
      .eq('category', categoryId)
      .eq('size', size)
      .eq('color', color)
      .eq('status', true);
    if (error) throw error;

    const list = (data || []).map((v) => `${v.weight || ''} ${v.unit || ''}`.trim()).filter(Boolean);
    return [...new Set(list)].sort();
  } catch (err) {
    console.error('getCapacitiesByCategorySizeAndColor database fetch failed:', err);
    throw err;
  }
};

export const getCapacitiesByCategoryAndSize = async (categoryId, size) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('weight, unit')
      .eq('category', categoryId)
      .eq('size', size)
      .eq('status', true);
    if (error) throw error;

    const list = (data || []).map((v) => `${v.weight || ''} ${v.unit || ''}`.trim()).filter(Boolean);
    return [...new Set(list)].sort();
  } catch (err) {
    console.error('getCapacitiesByCategoryAndSize database fetch failed:', err);
    throw err;
  }
};

export const findMatchingVariant = async (categoryId, size, color, loadCapacity) => {
  try {
    const parts = (loadCapacity || '').trim().split(' ');
    const weight = parts[0] || '';
    const unit = parts.slice(1).join(' ') || '';

    let query = supabase
      .from('products')
      .select('*')
      .eq('category', categoryId)
      .eq('size', size)
      .eq('weight', weight)
      .eq('unit', unit)
      .eq('status', true);

    if (color) {
      query = query.eq('color', color);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (!data || data.length === 0) return null;

    const matched = data[0];

    return {
      id: matched.id,
      category_id: matched.category,
      size: matched.size,
      color: matched.color,
      load_capacity: `${matched.weight || ''} ${matched.unit || ''}`.trim(),
      price: matched.price,
      stock: matched.stock,
      status: matched.status,
    };
  } catch (err) {
    console.error('findMatchingVariant database fetch failed:', err);
    throw err;
  }
};

// Admin Category CRUD
export const addCategory = async (categoryData) => {
  try {
    const productId = `CAT-${Date.now()}`;
    const payload = {
      product_id: productId,
      name: `Category Placeholder - ${categoryData.name}`,
      category: categoryData.name,
      size: 'Placeholder',
      color: 'Placeholder',
      weight: '0',
      unit: 'KG',
      status: false,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.category,
      name: data.category,
      description: '',
      image_url: '',
    };
  } catch (err) {
    console.error('addCategory database insert failed:', err);
    throw err;
  }
};

export const updateCategory = async (id, categoryData) => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ category: categoryData.name })
      .eq('category', id);
    if (error) throw error;

    return {
      id: categoryData.name,
      name: categoryData.name,
      description: '',
      image_url: '',
    };
  } catch (err) {
    console.error('updateCategory database update failed:', err);
    throw err;
  }
};

export const deleteCategory = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('category', id);
    if (error) throw error;
  } catch (err) {
    console.error('deleteCategory database delete failed:', err);
    throw err;
  }
};

// Admin Product Variant CRUD
export const addProductVariant = async (variantData) => {
  try {
    const parts = (variantData.load_capacity || '').trim().split(' ');
    const weight = parts[0] || '';
    const unit = parts.slice(1).join(' ') || '';

    const productId = `PRD-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const payload = {
      product_id: productId,
      name: `${variantData.category_id} - ${variantData.size}`,
      category: variantData.category_id,
      sub_category: variantData.sub_category || null,
      size: variantData.size,
      color: variantData.color,
      weight: weight,
      unit: unit,
      status: true,
      price: variantData.price || null,
      stock: variantData.stock || null,
    };

    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    // Clean up placeholder rows in this category
    await supabase
      .from('products')
      .delete()
      .eq('category', variantData.category_id)
      .eq('size', 'Placeholder')
      .eq('color', 'Placeholder');

    return {
      id: data.id,
      category_id: data.category,
      sub_category: data.sub_category,
      size: data.size,
      color: data.color,
      load_capacity: `${data.weight || ''} ${data.unit || ''}`.trim(),
      price: data.price,
      stock: data.stock,
      status: data.status,
    };
  } catch (err) {
    console.error('addProductVariant database insert failed:', err);
    throw err;
  }
};

export const updateProductVariant = async (id, variantData) => {
  try {
    const parts = (variantData.load_capacity || '').trim().split(' ');
    const weight = parts[0] || '';
    const unit = parts.slice(1).join(' ') || '';

    const payload = {
      size: variantData.size,
      color: variantData.color,
      weight: weight,
      unit: unit,
      price: variantData.price !== undefined ? variantData.price : null,
      stock: variantData.stock !== undefined ? variantData.stock : null,
    };
    if (variantData.sub_category !== undefined) {
      payload.sub_category = variantData.sub_category;
    }

    const { data, error } = await supabase
      .from('products')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      category_id: data.category,
      sub_category: data.sub_category,
      size: data.size,
      color: data.color,
      load_capacity: `${data.weight || ''} ${data.unit || ''}`.trim(),
      price: data.price,
      stock: data.stock,
      status: data.status,
    };
  } catch (err) {
    console.error('updateProductVariant database update failed:', err);
    throw err;
  }
};

export const deleteProductVariant = async (id) => {
  try {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('deleteProductVariant database delete failed:', err);
    throw err;
  }
};

export const getVariantsByCategory = async (categoryId) => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('category', categoryId);
    if (error) throw error;

    // Filter out placeholder rows for admin view (row must have BOTH size AND color as 'Placeholder')
    const activeVariants = (data || []).filter(p => !(p.size === 'Placeholder' && p.color === 'Placeholder'));

    return activeVariants.map((p) => ({
      id: p.id,
      category_id: p.category,
      sub_category: p.sub_category,
      size: p.size,
      color: p.color,
      load_capacity: `${p.weight || ''} ${p.unit || ''}`.trim(),
      price: p.price,
      stock: p.stock,
      status: p.status,
    }));
  } catch (err) {
    console.error('getVariantsByCategory database fetch failed:', err);
    throw err;
  }
};

// Subcategory CRUD
export const getSubcategories = async (categoryId) => {
  try {
    const { data, error } = await supabase
      .from('subcategories')
      .select('*')
      .eq('category_id', categoryId)
      .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('getSubcategories database fetch failed:', err);
    throw err;
  }
};

export const addSubcategory = async (subcategoryData) => {
  try {
    // Get max position to append
    const { data: existing } = await supabase
      .from('subcategories')
      .select('position')
      .eq('category_id', subcategoryData.categoryId)
      .order('position', { ascending: false })
      .limit(1);
    
    const nextPosition = existing && existing.length > 0 ? (existing[0].position + 1) : 1;

    const payload = {
      category_id: subcategoryData.categoryId,
      name: subcategoryData.name,
      image: subcategoryData.image || '',
      position: subcategoryData.position !== undefined ? subcategoryData.position : nextPosition,
      is_active: subcategoryData.isActive !== undefined ? subcategoryData.isActive : true,
    };

    const { data, error } = await supabase
      .from('subcategories')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      categoryId: data.category_id,
      name: data.name,
      image: data.image,
      position: data.position,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('addSubcategory database insert failed:', err);
    throw err;
  }
};

export const updateSubcategory = async (id, subcategoryData) => {
  try {
    const payload = {};
    if (subcategoryData.name !== undefined) payload.name = subcategoryData.name;
    if (subcategoryData.image !== undefined) payload.image = subcategoryData.image;
    if (subcategoryData.position !== undefined) payload.position = subcategoryData.position;
    if (subcategoryData.isActive !== undefined) payload.is_active = subcategoryData.isActive;

    const { data, error } = await supabase
      .from('subcategories')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    return {
      id: data.id,
      categoryId: data.category_id,
      name: data.name,
      image: data.image,
      position: data.position,
      isActive: data.is_active,
      createdAt: data.created_at,
    };
  } catch (err) {
    console.error('updateSubcategory database update failed:', err);
    throw err;
  }
};

export const deleteSubcategory = async (id) => {
  try {
    const { error } = await supabase
      .from('subcategories')
      .delete()
      .eq('id', id);
    if (error) throw error;
  } catch (err) {
    console.error('deleteSubcategory database delete failed:', err);
    throw err;
  }
};

export const updateSubcategoriesOrder = async (orderedItems) => {
  try {
    const results = await Promise.all(
      orderedItems.map((item, idx) =>
        supabase
          .from('subcategories')
          .update({ position: idx + 1 })
          .eq('id', item.id)
      )
    );

    for (const res of results) {
      if (res.error) {
        throw res.error;
      }
    }
  } catch (err) {
    console.error('updateSubcategoriesOrder database update failed:', err);
    throw err;
  }
};

// Dropdown Fields CRUD
export const getDropdownFields = async (categoryId) => {
  try {
    if (!categoryId) {
      return [
        { id: 'size', name: 'Size', position: 1 },
        { id: 'load_capacity', name: 'Load Capacity', position: 2 },
        { id: 'color', name: 'Color', position: 3 }
      ];
    }

    const { data, error } = await supabase
      .from('category_dropdown_fields')
      .select('*')
      .eq('category_id', categoryId)
      .order('position', { ascending: true });
    if (error) throw error;
    
    if (!data || data.length === 0) {
      return [
        { id: 'size', name: 'Size', position: 1 },
        { id: 'load_capacity', name: 'Load Capacity', position: 2 },
        { id: 'color', name: 'Color', position: 3 }
      ];
    }

    return data.map(item => ({
      id: item.field_id,
      name: item.name,
      position: item.position,
    }));
  } catch (err) {
    console.error('getDropdownFields database fetch failed:', err);
    return [
      { id: 'size', name: 'Size', position: 1 },
      { id: 'load_capacity', name: 'Load Capacity', position: 2 },
      { id: 'color', name: 'Color', position: 3 }
    ];
  }
};

export const updateDropdownFieldsOrder = async (categoryId, orderedItems) => {
  try {
    if (!categoryId) return;

    const results = await Promise.all(
      orderedItems.map((item, idx) => {
        const payload = {
          category_id: categoryId,
          field_id: item.id,
          name: item.name,
          position: idx + 1,
        };

        return supabase
          .from('category_dropdown_fields')
          .upsert(payload, { onConflict: 'category_id,field_id' });
      })
    );

    for (const res of results) {
      if (res.error) {
        throw res.error;
      }
    }
  } catch (err) {
    console.error('updateDropdownFieldsOrder database update failed:', err);
    throw err;
  }
};




