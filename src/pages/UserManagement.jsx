import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Edit, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editPassword, setEditPassword] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      setUsers(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Error fetching users: ' + error.message);
    }
  };

  const createUser = async (e) => {
    e.preventDefault();
    
    if (!newUserEmail || !newUserPassword) {
      toast.error('Please provide both email and password');
      return;
    }
    
    if (newUserPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: newUserEmail,
        password: newUserPassword,
        email_confirm: true
      });
      if (error) {
        console.error('Supabase error:', error);
        if (error.status === 422) {
          if (error.message && error.message.toLowerCase().includes('already exists')) {
            toast.error('A user with this email already exists. Please use a different email address.');
          } else if (error.message && error.message.toLowerCase().includes('password')) {
            toast.error('Invalid password: The password should be at least 6 characters long.');
          } else {
            toast.error('Invalid input: Please check the email and password.');
          }
        } else if (error.status === 403) {
          toast.error('You do not have permission to create users. Please contact your administrator.');
        } else {
          toast.error('An error occurred while creating the user. Please try again.');
        }
        return;
      }

      if (!data || !data.user) {
        throw new Error('User data not returned from Supabase');
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(
        data.user.id,
        { app_metadata: { is_admin: isAdmin } }
      );
      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      toast.success('User created successfully');
      fetchUsers();
      setNewUserEmail('');
      setNewUserPassword('');
      setIsAdmin(false);
    } catch (error) {
      console.error('Error creating user:', error);
      if (error.message && error.message.toLowerCase().includes('duplicate key')) {
        toast.error('A user with this email already exists. Please use a different email address.');
      } else {
        toast.error('Error creating user: ' + (error.message || 'Unknown error occurred'));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser({
      ...user,
      originalEmail: user.email,
      originalIsAdmin: user.app_metadata?.is_admin
    });
    setEditPassword('');
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updates = {};
      if (editingUser.email !== editingUser.originalEmail) {
        updates.email = editingUser.email;
      }
      if (editingUser.app_metadata.is_admin !== editingUser.originalIsAdmin) {
        updates.app_metadata = { is_admin: editingUser.app_metadata.is_admin };
      }
      if (editPassword) {
        updates.password = editPassword;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to update');
        return;
      }

      const { error } = await supabase.auth.admin.updateUserById(editingUser.id, updates);
      if (error) throw error;
      toast.success('User updated successfully');
      fetchUsers();
      setEditingUser(null);
      setEditPassword('');
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Error updating user: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      toast.success('User deleted successfully');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Error deleting user: ' + error.message);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">User Management</h2>
      
      {/* Add User Form */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add New User</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={createUser} className="space-y-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isAdmin"
                checked={isAdmin}
                onChange={(e) => setIsAdmin(e.target.checked)}
              />
              <Label htmlFor="isAdmin">Is Admin</Label>
            </div>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add User'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* User List */}
      <Card>
        <CardHeader>
          <CardTitle>User List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.app_metadata?.is_admin ? 'Admin' : 'User'}</TableCell>
                  <TableCell>
                    <Button onClick={() => handleEdit(user)} className="mr-2">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button onClick={() => handleDelete(user.id)} variant="destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      {editingUser && (
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <Label htmlFor="editEmail">Email</Label>
                <Input
                  id="editEmail"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                  required
                />
              </div>
              <div>
                <Label htmlFor="editPassword">New Password (optional)</Label>
                <div className="relative">
                  <Input
                    id="editPassword"
                    type={showEditPassword ? "text" : "password"}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
                  >
                    {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="editIsAdmin"
                  checked={editingUser.app_metadata?.is_admin}
                  onChange={(e) => setEditingUser({...editingUser, app_metadata: {...editingUser.app_metadata, is_admin: e.target.checked}})}
                />
                <Label htmlFor="editIsAdmin">Is Admin</Label>
              </div>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update User'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default UserManagement;