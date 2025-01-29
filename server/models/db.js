import { supabase } from '../config/supabase.js'

// Funções para Transações
export const getTransactions = async (userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
    
    if (error) throw error
    return data
}

export const addTransaction = async (transaction, userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .insert([{ ...transaction, user_id: userId }])
        .select()
    
    if (error) throw error
    return data[0]
}

export const updateTransaction = async (id, transaction, userId) => {
    const { data, error } = await supabase
        .from('transactions')
        .update(transaction)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
    
    if (error) throw error
    return data[0]
}

export const deleteTransaction = async (id, userId) => {
    const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    
    if (error) throw error
    return true
}

// Funções para Configurações do Usuário
export const getUserSettings = async (userId) => {
    const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data
}

export const updateUserSettings = async (settings, userId) => {
    const { data, error } = await supabase
        .from('user_settings')
        .upsert({ ...settings, user_id: userId })
        .select()
    
    if (error) throw error
    return data[0]
}

// Funções para Categorias
export const getCategories = async (userId) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', userId)
    
    if (error) throw error
    return data
}

export const addCategory = async (category, userId) => {
    const { data, error } = await supabase
        .from('categories')
        .insert([{ ...category, user_id: userId }])
        .select()
    
    if (error) throw error
    return data[0]
}

export const updateCategory = async (id, category, userId) => {
    const { data, error } = await supabase
        .from('categories')
        .update(category)
        .eq('id', id)
        .eq('user_id', userId)
        .select()
    
    if (error) throw error
    return data[0]
}

export const deleteCategory = async (id, userId) => {
    const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)
        .eq('user_id', userId)
    
    if (error) throw error
    return true
} 