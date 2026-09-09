import 'package:clerk_auth/clerk_auth.dart' as clerk;
import 'package:clerk_flutter/clerk_flutter.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/validation/phone.dart';

enum AuthMode { signIn, signUp }

/// Custom Arabic auth UI mirrored with web (`admin` sign-in / sign-up forms).
class CustomAuthScreen extends StatefulWidget {
  const CustomAuthScreen({
    super.key,
    this.initialMode = AuthMode.signIn,
  });

  final AuthMode initialMode;

  @override
  State<CustomAuthScreen> createState() => _CustomAuthScreenState();
}

class _CustomAuthScreenState extends State<CustomAuthScreen> {
  late AuthMode _mode;
  var _step = _SignUpStep.details;

  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _codeController = TextEditingController();

  String? _error;
  var _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _mode = widget.initialMode;
  }

  @override
  void dispose() {
    _fullNameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _codeController.dispose();
    super.dispose();
  }

  void _switchMode(AuthMode mode) {
    setState(() {
      _mode = mode;
      _step = _SignUpStep.details;
      _error = null;
      _codeController.clear();
    });
  }

  Future<void> _submitSignIn() async {
    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignIn(
            strategy: clerk.Strategy.password,
            identifier: _emailController.text.trim(),
            password: _passwordController.text,
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
      } else if (_error == null) {
        setState(() => _error = 'تعذر إكمال تسجيل الدخول.');
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitSignUpDetails() async {
    final phoneError = phoneValidationMessage(_phoneController.text);
    if (phoneError != null) {
      setState(() => _error = phoneError);
      return;
    }

    final fullName = _fullNameController.text.trim();
    if (fullName.length < 3) {
      setState(() => _error = 'الاسم مطلوب بالكامل.');
      return;
    }

    final password = _passwordController.text;
    if (password.length < 15) {
      setState(() => _error = 'كلمة المرور يجب أن تكون 15 حرفًا على الأقل.');
      return;
    }

    final parts = fullName.split(RegExp(r'\s+'));
    final firstName = parts.first;
    final lastName = parts.length > 1 ? parts.sublist(1).join(' ') : '-';
    final localPhone = normalizePhone(_phoneController.text);

    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignUp(
            strategy: clerk.Strategy.password,
            emailAddress: _emailController.text.trim(),
            password: password,
            passwordConfirmation: password,
            firstName: firstName,
            lastName: lastName,
            metadata: {'egyptianPhone': localPhone},
          );

          if (authState.signUp?.unverified(clerk.Field.emailAddress) == true) {
            await authState.attemptSignUp(strategy: clerk.Strategy.emailCode);
          }
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
        return;
      }

      if (_error == null) {
        setState(() => _step = _SignUpStep.verify);
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  Future<void> _submitVerification() async {
    final authState = ClerkAuth.of(context, listen: false);
    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      await authState.safelyCall(
        context,
        () async {
          await authState.attemptSignUp(
            strategy: clerk.Strategy.emailCode,
            code: _codeController.text.trim(),
          );
        },
        onError: (error) {
          if (mounted) {
            setState(() => _error = error.message);
          }
        },
      );

      if (!mounted) return;
      if (authState.user != null) {
        Navigator.of(context).pop();
      } else if (_error == null) {
        setState(() {
          _error = 'لم يكتمل التحقق بعد. تأكد من الرمز وحاول مجددًا.';
        });
      }
    } catch (error) {
      if (mounted) {
        setState(() => _error = error.toString());
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isSignUp = _mode == AuthMode.signUp;
    final showingVerify = isSignUp && _step == _SignUpStep.verify;

    return Scaffold(
      backgroundColor: TakkaColors.cream,
      appBar: AppBar(
        backgroundColor: TakkaColors.cream,
        leading: IconButton(
          icon: const Icon(Icons.close_rounded),
          onPressed: () => Navigator.of(context).pop(),
        ),
      ),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 8, 20, 28),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 440),
              child: Card(
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      Text(
                        showingVerify
                            ? 'تأكيد الحساب'
                            : isSignUp
                                ? 'إنشاء حساب'
                                : 'تسجيل الدخول',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.headlineSmall?.copyWith(
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text(
                        showingVerify
                            ? 'أرسلنا رمز التأكيد إلى بريدك الإلكتروني. أدخله لإكمال إنشاء الحساب.'
                            : isSignUp
                                ? 'أدخل رقم هاتفك والاسم والإيميل. رمز التأكيد سيصل على البريد الإلكتروني.'
                                : 'ادخل بالإيميل وكلمة المرور لمتابعة طلباتك أو إدارة مطبخك.',
                        textAlign: TextAlign.center,
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: TakkaColors.muted,
                          height: 1.65,
                        ),
                      ),
                      const SizedBox(height: 22),
                      if (showingVerify)
                        ..._buildVerifyFields()
                      else if (isSignUp)
                        ..._buildSignUpFields()
                      else
                        ..._buildSignInFields(),
                      if (_error != null) ...[
                        const SizedBox(height: 12),
                        Text(
                          _error!,
                          style: const TextStyle(
                            color: Color(0xFFC62828),
                            height: 1.45,
                          ),
                        ),
                      ],
                      const SizedBox(height: 18),
                      FilledButton(
                        onPressed: _isSubmitting
                            ? null
                            : () {
                                if (showingVerify) {
                                  _submitVerification();
                                } else if (isSignUp) {
                                  _submitSignUpDetails();
                                } else {
                                  _submitSignIn();
                                }
                              },
                        child: Text(
                          _isSubmitting
                              ? (showingVerify
                                  ? 'جارٍ التحقق...'
                                  : isSignUp
                                      ? 'جارٍ إنشاء الحساب...'
                                      : 'جارٍ الدخول...')
                              : (showingVerify
                                  ? 'تأكيد الحساب'
                                  : isSignUp
                                      ? 'متابعة'
                                      : 'تسجيل الدخول'),
                        ),
                      ),
                      if (!showingVerify) ...[
                        const SizedBox(height: 16),
                        Wrap(
                          alignment: WrapAlignment.center,
                          crossAxisAlignment: WrapCrossAlignment.center,
                          children: [
                            Text(
                              isSignUp
                                  ? 'لديك حساب بالفعل؟ '
                                  : 'ليس لديك حساب؟ ',
                              style: theme.textTheme.bodyMedium?.copyWith(
                                color: TakkaColors.muted,
                              ),
                            ),
                            TextButton(
                              onPressed: _isSubmitting
                                  ? null
                                  : () => _switchMode(
                                        isSignUp
                                            ? AuthMode.signIn
                                            : AuthMode.signUp,
                                      ),
                              style: TextButton.styleFrom(
                                foregroundColor: TakkaColors.secondary,
                                padding: EdgeInsets.zero,
                                minimumSize: Size.zero,
                                tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                              ),
                              child: Text(
                                isSignUp ? 'تسجيل الدخول' : 'إنشاء حساب',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  List<Widget> _buildSignInFields() {
    return [
      _LabeledField(
        label: 'البريد الإلكتروني',
        child: TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: 'name@email.com'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'كلمة المرور',
        child: TextField(
          controller: _passwordController,
          obscureText: true,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) {
            if (!_isSubmitting) _submitSignIn();
          },
          decoration: const InputDecoration(),
        ),
      ),
    ];
  }

  List<Widget> _buildSignUpFields() {
    return [
      _LabeledField(
        label: 'الاسم الكامل',
        child: TextField(
          controller: _fullNameController,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: '(الاسم +اللقب)'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'رقم الهاتف',
        child: TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.next,
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            LengthLimitingTextInputFormatter(11),
          ],
          decoration: const InputDecoration(hintText: '01*********'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'البريد الإلكتروني',
        child: TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.next,
          decoration: const InputDecoration(hintText: 'name@email.com'),
        ),
      ),
      const SizedBox(height: 14),
      _LabeledField(
        label: 'كلمة المرور',
        child: TextField(
          controller: _passwordController,
          obscureText: true,
          textInputAction: TextInputAction.done,
          decoration: const InputDecoration(
            hintText: '15 حرفًا على الأقل',
          ),
        ),
      ),
    ];
  }

  List<Widget> _buildVerifyFields() {
    return [
      _LabeledField(
        label: 'رمز التأكيد',
        child: TextField(
          controller: _codeController,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.done,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          decoration: const InputDecoration(hintText: '123456'),
          onSubmitted: (_) {
            if (!_isSubmitting) _submitVerification();
          },
        ),
      ),
    ];
  }
}

enum _SignUpStep { details, verify }

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.child,
  });

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          label,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                fontWeight: FontWeight.w700,
              ),
        ),
        const SizedBox(height: 8),
        child,
      ],
    );
  }
}
